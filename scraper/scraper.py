#!/usr/bin/env python3
"""
Парсер цен металлопроката с mc.ru (МЕТАЛЛСЕРВИС, филиал Санкт-Петербург).

Запускается по cron раз в сутки: тянет товары по категориям, извлекает поля
(размер, марка, ГОСТ, длина, единица, наличие), применяет наценку по той же
формуле, что и сайт (товар > категория > глобальная настройка), и пишет
результат в тот же PostgreSQL, что использует Next.js-сайт (через Prisma-схему).

ВАЖНО про доступ к mc.ru:
  Сайт молча дропает TLS-handshake для нераспознанного JA3/JA4-фингерпринта
  и/или датацентровых IP. Поэтому ПЕРВЫМ выбором используется curl_cffi
  (биндинг curl-impersonate), который копирует TLS-фингерпринт Chrome.
  Фолбэк — Playwright (chromium headless). Из обычной dev-среды (особенно
  не из РФ) mc.ru, скорее всего, недоступен — это ожидаемо, скрипт обрабатывает
  это штатно (FAILED + понятный errorText, без traceback). Проверять на VPS.

Запись в БД — raw SQL через psycopg3, все запросы параметризованы.
ВНИМАНИЕ к Prisma-маппингу: имена таблиц/колонок camelCase → требуют двойных
кавычек в SQL; колонка "updatedAt" НЕ имеет дефолта в БД (Prisma ставит её
через @updatedAt), поэтому raw-SQL обязан задавать её явно при каждом
INSERT/UPDATE; статус ScrapeRun — это enum "ScrapeStatus", значения кастуются.

CLI:
  --self-test            записать один синтетический товар mc-selftest-1 и
                         проверить коннект к БД + маппинг колонок (без mc.ru).
  --dry-run              спарсить и напечатать образцы, БЕЗ записи в БД.
  --category <slug>      обработать только одну категорию.
  --limit <N>            ограничить число товаров на категорию.
"""
from __future__ import annotations

import argparse
import hashlib
import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Iterator, Optional

# --- Третьи стороны (часть импортируется лениво) ---
from bs4 import BeautifulSoup  # noqa: E402
from tenacity import (  # noqa: E402
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    RetryError,
)

# psycopg3
import psycopg  # noqa: E402

# ============================================================================
# Конфиг из окружения
# ============================================================================

def _env_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on", "да"}


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://metal:metal@localhost:5433/metalshop"
)
SCRAPER_ENGINE = os.getenv("SCRAPER_ENGINE", "curl_cffi").strip().lower()
IMPERSONATE = os.getenv("IMPERSONATE", "chrome").strip()
BASE_URL = os.getenv("BASE_URL", "https://mc.ru").rstrip("/")
REGION = os.getenv("REGION", "speterburg").strip()
PRICE_INCLUDES_VAT = _env_bool("PRICE_INCLUDES_VAT", True)
REQUEST_DELAY = _env_float("REQUEST_DELAY", 1.5)
MAX_PAGES_PER_CATEGORY = _env_int("MAX_PAGES_PER_CATEGORY", 50)
REQUEST_TIMEOUT = _env_int("REQUEST_TIMEOUT", 30)
DEFAULT_MARKUP_PERCENT = _env_float("DEFAULT_MARKUP_PERCENT", 10.0)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").strip().upper()

# Профили имперсонации, которые перебирает curl_cffi-фолбэк.
IMPERSONATE_CHAIN = [IMPERSONATE, "chrome", "chrome120", "chrome110", "safari"]
# уберём дубли, сохранив порядок
IMPERSONATE_CHAIN = list(dict.fromkeys(IMPERSONATE_CHAIN))

# Категории-фолбэк (подтверждённые slug), если discovery не сработал.
FALLBACK_CATEGORY_SLUGS = [
    "armatura_katanka",
    "balki_dvutavrovye",
    "stal_listovaya_g_k",
    "stal_listovaya_ocinkovannaya",
    "ugolok",
    "shveller_gnutyj",
    "krug_g_k",
    "polosa_g_k",
    "prokat_trub",
    "truby_ehlektrosvarnye_kruglye",
    "truby_ehlektrosvarnye_kvadratnye",
    "provoloka_torgovaya_obyknovennogo_kachestva",
    "setka_lenta",
    "krepezh_gvozdi_bolty_cepi",
    "med_bronza_latun",
    "instrumentalnaya_stal",
]

# Слаги/слова цветмета и метизов → цена за КГ (а не за тонну).
# Латиница — для слагов URL, кириллица — для наименований товаров.
PER_KG_HINTS = (
    # латиница (слаги)
    "med", "bronza", "latun", "alumin", "alyumin", "cvetmet", "cvet",
    "krepezh", "gvozd", "bolt", "cep", "provoloka", "setka",
    # кириллица (наименования)
    "медь", "медн", "бронз", "латун", "алюмин", "цветмет",
    "крепеж", "крепёж", "гвозд", "болт", "цеп", "проволок", "сетк",
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

log = logging.getLogger("mc-scraper")


# ============================================================================
# Исключения
# ============================================================================

class ScraperError(Exception):
    """Базовая ошибка парсера."""


class SiteUnavailableError(ScraperError):
    """mc.ru недоступен из этой среды (TLS-блок / сетевой таймаут)."""


# ============================================================================
# Загрузка страниц (выбор движка + ретраи + троттлинг)
# ============================================================================

# Типы сетевых ошибок curl_cffi подгружаем лениво (модуль может быть не нужен
# при --self-test). Заполняется в _ensure_curl().
_CURL_REQUESTS = None
_CURL_ERRORS: tuple = ()


def _ensure_curl():
    """Лениво импортировать curl_cffi. Бросает ScraperError, если не установлен."""
    global _CURL_REQUESTS, _CURL_ERRORS
    if _CURL_REQUESTS is not None:
        return _CURL_REQUESTS
    try:
        from curl_cffi import requests as creq  # type: ignore
    except Exception as e:  # ImportError или проблема с libcurl
        raise ScraperError(
            "curl_cffi не установлен/не загружается: %s. "
            "Установите `pip install curl_cffi` или переключитесь на "
            "SCRAPER_ENGINE=playwright." % e
        )
    _CURL_REQUESTS = creq
    # Собираем кортеж исключений соединения, какие есть в этой версии.
    errs = []
    try:
        from curl_cffi.requests.exceptions import (  # type: ignore
            ConnectionError as CurlConnError,
            Timeout as CurlTimeout,
            RequestException as CurlReqExc,
        )
        errs.extend([CurlConnError, CurlTimeout, CurlReqExc])
    except Exception:
        pass
    try:
        from curl_cffi import CurlError  # type: ignore
        errs.append(CurlError)
    except Exception:
        pass
    _CURL_ERRORS = tuple(errs) or (Exception,)
    return _CURL_REQUESTS


class Fetcher:
    """Загрузчик страниц с выбором движка и повторными попытками.

    curl_cffi — основной (обходит TLS-фильтр имперсонацией Chrome).
    playwright — фолбэк (импортируется лениво, только если задан движок
    или curl_cffi вернул сетевую ошибку на всех профилях).
    """

    def __init__(self, engine: str = SCRAPER_ENGINE):
        self.engine = engine
        self._session = None  # curl_cffi session
        self._pw = None       # (playwright, browser) кортеж для фолбэка
        self._last_request_ts = 0.0

    # ---- троттлинг ----
    def _throttle(self):
        elapsed = time.monotonic() - self._last_request_ts
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        self._last_request_ts = time.monotonic()

    # ---- публичный fetch с ретраями ----
    def fetch(self, url: str) -> str:
        """Вернуть HTML страницы. Бросает SiteUnavailableError при TLS-блоке."""
        @retry(
            retry=retry_if_exception_type(SiteUnavailableError),
            stop=stop_after_attempt(3),
            wait=wait_exponential(multiplier=1, min=2, max=15),
            reraise=True,
        )
        def _do() -> str:
            self._throttle()
            if self.engine == "playwright":
                return self._fetch_playwright(url)
            return self._fetch_curl(url)

        try:
            return _do()
        except RetryError as e:  # на всякий случай, reraise=True уже разворачивает
            raise SiteUnavailableError(str(e)) from e

    # ---- curl_cffi ----
    def _fetch_curl(self, url: str) -> str:
        creq = _ensure_curl()
        last_exc: Optional[Exception] = None
        # Перебираем профили имперсонации — фильтр может пускать только часть.
        for imp in IMPERSONATE_CHAIN:
            try:
                log.debug("curl_cffi GET %s (impersonate=%s)", url, imp)
                resp = creq.get(
                    url,
                    impersonate=imp,
                    headers=DEFAULT_HEADERS,
                    timeout=REQUEST_TIMEOUT,
                    allow_redirects=True,
                )
                status = resp.status_code
                if status >= 500:
                    raise SiteUnavailableError(
                        f"mc.ru вернул {status} на {url}"
                    )
                if status in (403, 429):
                    # Антибот мог сработать на этом профиле — пробуем следующий.
                    log.warning("HTTP %s на %s (impersonate=%s) — меняю профиль",
                                status, url, imp)
                    last_exc = SiteUnavailableError(f"HTTP {status} ({imp})")
                    continue
                return resp.text
            except _CURL_ERRORS as e:  # сетевой/TLS уровень — главный симптом блока
                log.warning(
                    "curl_cffi сетевая ошибка на %s (impersonate=%s): %s",
                    url, imp, e,
                )
                last_exc = e
                continue
        # Все профили curl_cffi не прошли. Пробуем Playwright, если он есть.
        if self._try_enable_playwright_fallback():
            log.warning("curl_cffi не справился — фолбэк на Playwright")
            return self._fetch_playwright(url)
        raise SiteUnavailableError(
            "mc.ru недоступен через curl_cffi (перебраны профили %s). "
            "Похоже на TLS-блок/датацентровый IP. Последняя ошибка: %s"
            % (IMPERSONATE_CHAIN, last_exc)
        )

    def _try_enable_playwright_fallback(self) -> bool:
        """Попытаться поднять Playwright как фолбэк. True, если доступен."""
        if self._pw is not None:
            return True
        try:
            self._init_playwright()
            return True
        except Exception as e:
            log.debug("Playwright-фолбэк недоступен: %s", e)
            return False

    # ---- playwright (ленивый) ----
    def _init_playwright(self):
        from playwright.sync_api import sync_playwright  # type: ignore
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=True)
        self._pw = (pw, browser)

    def _fetch_playwright(self, url: str) -> str:
        if self._pw is None:
            self._init_playwright()
        _pw, browser = self._pw  # type: ignore
        context = browser.new_context(
            user_agent=USER_AGENT, locale="ru-RU"
        )
        page = context.new_page()
        try:
            log.debug("playwright GET %s", url)
            resp = page.goto(url, timeout=REQUEST_TIMEOUT * 1000,
                             wait_until="domcontentloaded")
            if resp is not None and resp.status >= 500:
                raise SiteUnavailableError(f"mc.ru вернул {resp.status} на {url}")
            html = page.content()
            return html
        except Exception as e:
            # Сетевой таймаут Playwright = тот же симптом TLS-блока.
            raise SiteUnavailableError(
                f"playwright не смог открыть {url}: {e}"
            ) from e
        finally:
            context.close()

    def close(self):
        if self._pw is not None:
            try:
                _pw, browser = self._pw
                browser.close()
                _pw.stop()
            except Exception:
                pass
            self._pw = None


# ============================================================================
# Извлечение полей из текста наименования / слага
# ============================================================================

RE_GOST = re.compile(r"\bГОСТ\s*\d{3,5}(?:[-‑–]\d{2,4})?", re.IGNORECASE)
RE_TU = re.compile(r"\bТУ\s*[\d\-\.]{4,}", re.IGNORECASE)
# Размеры: 30х30х3, 100x100x8, 57х3.5, Ø12, ⌀12, 10П, 12Б1, d12, дл.
RE_SIZE_PROFILE = re.compile(
    # до 3 размерных групп: 30х30х3 (уголок/труба), 10х1500х6000 (лист)
    r"\b(\d{1,4}(?:[.,]\d+)?(?:[xх×*]\d{1,4}(?:[.,]\d+)?){1,3})\b", re.IGNORECASE
)
RE_SIZE_DIAM = re.compile(r"(?:Ø|⌀|[dD]|диам(?:етр)?\.?\s*)\s*(\d{1,3}(?:[.,]\d+)?)")
RE_SIZE_NUMBERED = re.compile(r"\b(\d{1,3}(?:[.,]\d+)?\s?[ПУБШКпубшк])\b")
# Марка: Ст3сп, Ст3, С255, С345, А240, А500С, 09Г2С, АД31Т1, 3сп, 12Х18Н10Т.
# ВАЖНО: легированные марки (09Г2С, 12Х18Н10Т) используют ЗАГЛАВНЫЕ кириллические
# Х/Г/С, тогда как разделитель размера — строчные х/x (30х30х3). Поэтому ветка
# легированных марок РЕГИСТРОЗАВИСИМА (только заглавные Х/Г/С) и требует цифру
# после буквы, иначе «30х» из размера ложно матчился бы как марка.
RE_GRADE = re.compile(
    r"\b("
    r"А\d{3}С?(?![а-яА-Я])|"           # арматурные классы А240, А500С
    r"С\d{3}[А-Яа-я]*|"                # строит. стали С255, С345
    r"Ст\.?\d+[а-яА-Я]*|"             # Ст3сп, Ст3пс, Ст.3
    r"\d{2}[ХГС]\d[ХГСНТМФВЮДА-Я0-9]*|"  # 09Г2С, 12Х18Н10Т — Х/Г/С только ЗАГЛАВНЫЕ + цифра
    r"АД\d+[А-Яа-я0-9]*|"             # алюминий АД31Т1
    r"Д16[ТтАа]?|АМг\d?|АМц|"         # дюраль Д16Т, АМг, АМц
    r"Л\d{2,3}|ЛС\d+[\-\d]*|"          # латунь Л63, ЛС59
    r"М\d[а-я]?(?![а-яА-Я])|"          # медь М1, М2 (не «Метр»)
    r"\d{1,2}сп|\d{1,2}пс|\d{1,2}кп"  # 3сп, 5пс, 08кп
    r")\b"
)
# Длина: «дл 12 м», «дл. 11.7м», «L=12000», «12000 мм», «длина 6 м».
RE_LENGTH = re.compile(
    r"(?:дл(?:ина)?\.?\s*|L\s*=?\s*|длиной\s*)"
    r"(\d{1,2}(?:[.,]\d+)?)\s*м(?:етр)?\b",
    re.IGNORECASE,
)
RE_LENGTH_MM = re.compile(r"\b(\d{4,5})\s*мм\b", re.IGNORECASE)

# Цена в тексте: «от 54 200 руб ... за тонну», «от 180 руб/кг».
RE_PRICE = re.compile(
    r"(?:от\s*)?"
    r"(\d[\d   ]{2,}(?:[.,]\d{1,2})?)"   # число, возможно с разделителями тысяч
    r"\s*(?:руб|р\.|₽)",
    re.IGNORECASE,
)
RE_UNIT_MARKER = re.compile(
    r"за\s*(тонн[ауы]|т\b|кг|килограмм|метр|пог\.?\s*м|м\b|шт|тыс\.?\s*шт)",
    re.IGNORECASE,
)
RE_IN_STOCK = re.compile(r"в\s+наличии", re.IGNORECASE)


def _clean(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    t = re.sub(r"[\s  ]+", " ", text).strip()
    return t or None


def parse_price(text: str) -> Optional[Decimal]:
    """Достать первую цену (руб) из текста."""
    m = RE_PRICE.search(text)
    if not m:
        return None
    raw = m.group(1)
    raw = raw.replace(" ", "").replace(" ", "").replace(" ", "")
    raw = raw.replace(",", ".")
    try:
        val = Decimal(raw)
    except Exception:
        return None
    if val <= 0:
        return None
    return val


def detect_unit(text: str, slug: str = "") -> str:
    """Определить единицу измерения.

    Приоритет: явный маркер «за <unit>» в тексте → эвристика по типу металла.
    Чёрный прокат → 'т', цветмет/метизы → 'кг'.
    """
    m = RE_UNIT_MARKER.search(text)
    if m:
        token = m.group(1).lower()
        if token.startswith("тонн") or token == "т":
            return "т"
        if token.startswith("кг") or token.startswith("килограмм"):
            return "кг"
        if token.startswith("тыс"):
            return "тыс.шт"
        if token.startswith("шт"):
            return "шт"
        if "м" in token:  # метр / пог.м
            return "м"
    # Эвристика по слагу/наименованию.
    hay = (slug + " " + text).lower()
    if any(h in hay for h in PER_KG_HINTS):
        return "кг"
    return "т"


def extract_size(name: str, slug: str = "") -> Optional[str]:
    for rx in (RE_SIZE_PROFILE, RE_SIZE_NUMBERED, RE_SIZE_DIAM):
        m = rx.search(name)
        if m:
            return _clean(m.group(1) if rx is RE_SIZE_DIAM else m.group(0))
    # запасной источник — слаг товара: ..._razmer_30x30x3_...
    m = re.search(r"razmer[_-]([0-9xх×.,_-]+?)(?:_|$)", slug, re.IGNORECASE)
    if m:
        return _clean(m.group(1).replace("_", "x"))
    return None


def extract_grade(name: str, slug: str = "") -> Optional[str]:
    # Сначала вырезаем размерные токены (30х30х3, 57х3.5), чтобы они не
    # перетягивали матч марки. Заменяем на пробел, позиции прочего не важны.
    cleaned = RE_SIZE_PROFILE.sub(" ", name)
    m = RE_GRADE.search(cleaned)
    if m:
        return _clean(m.group(1))
    m = re.search(r"marka[_-]([A-Za-zА-Яа-я0-9]+)", slug, re.IGNORECASE)
    if m:
        return _clean(m.group(1))
    return None


def extract_gost(name: str) -> Optional[str]:
    m = RE_GOST.search(name)
    if m:
        return _clean(m.group(0))
    m = RE_TU.search(name)
    if m:
        return _clean(m.group(0))
    return None


def extract_length(name: str, slug: str = "") -> Optional[str]:
    m = RE_LENGTH.search(name)
    if m:
        return _clean(m.group(1).replace(",", ".") + " м")
    m = RE_LENGTH_MM.search(name)
    if m:
        return _clean(m.group(1) + " мм")
    m = re.search(r"dlina[_-](\d{1,5})", slug, re.IGNORECASE)
    if m:
        return _clean(m.group(1))
    return None


# ============================================================================
# Модель товара
# ============================================================================

@dataclass
class ScrapedProduct:
    name: str
    base_price: Decimal
    unit: str = "т"
    size: Optional[str] = None
    steel_grade: Optional[str] = None
    gost: Optional[str] = None
    length: Optional[str] = None
    in_stock: bool = True
    stock_text: Optional[str] = None
    source_url: Optional[str] = None
    product_slug: Optional[str] = None  # слаг товара на mc.ru, если найден

    @property
    def external_id(self) -> str:
        """mc-<slug-товара> или mc-<хэш source_url/имени>. Не конфликтует с seed-*."""
        if self.product_slug:
            return f"mc-{self.product_slug}"
        basis = self.source_url or self.name
        digest = hashlib.sha1(basis.encode("utf-8")).hexdigest()[:16]
        return f"mc-{digest}"

    @property
    def db_slug(self) -> str:
        """Уникальный slug для колонки Product.slug (uniq). Префикс mc- для развода с seed."""
        if self.product_slug:
            return f"mc-{self.product_slug}"
        return self.external_id  # уже mc-<hash>


# ============================================================================
# Discovery категорий
# ============================================================================

@dataclass
class CategoryRef:
    slug: str
    name: str
    url: str


def _category_url(slug: str) -> str:
    # Подтверждённый формат пагинации: /metalloprokat/<slug>/PageN/<N>
    return f"{BASE_URL}/metalloprokat/{slug}"


def discover_categories(fetcher: Fetcher) -> list[CategoryRef]:
    """Загрузить корень региона и вытащить ссылки на категории металлопроката.

    Ищем ссылки вида /region/<region>/metalloprokat/<slug> и /metalloprokat/<slug>.
    При неудаче — фолбэк на FALLBACK_CATEGORY_SLUGS.
    TODO(live): подтвердить реальную разметку корня /products/<region> на VPS —
    возможно, категории лежат в конкретном блоке (nav/aside), тогда сузить поиск.
    """
    root_url = f"{BASE_URL}/products/{REGION}"
    found: dict[str, CategoryRef] = {}
    try:
        html = fetcher.fetch(root_url)
        soup = BeautifulSoup(html, "lxml")
        rx = re.compile(
            r"^/(?:region/" + re.escape(REGION) + r"/)?metalloprokat/([a-z0-9_]+)/?$",
            re.IGNORECASE,
        )
        for a in soup.find_all("a", href=True):
            href = a["href"].split("?")[0].split("#")[0]
            m = rx.match(href)
            if not m:
                continue
            slug = m.group(1).lower()
            if slug in found:
                continue
            name = _clean(a.get_text()) or slug
            found[slug] = CategoryRef(slug=slug, name=name, url=_category_url(slug))
        if found:
            log.info("discovery: найдено %d категорий на %s", len(found), root_url)
            return list(found.values())
        log.warning("discovery: на %s не нашли ссылок категорий — фолбэк на список",
                    root_url)
    except SiteUnavailableError:
        raise  # пробросить — это TLS-блок, обрабатывается выше
    except Exception as e:
        log.warning("discovery упал (%s) — фолбэк на список slug", e)

    return [
        CategoryRef(slug=s, name=s.replace("_", " ").capitalize(), url=_category_url(s))
        for s in FALLBACK_CATEGORY_SLUGS
    ]


# ============================================================================
# Парсинг страницы категории (защитный, несколько стратегий)
# ============================================================================

def _page_url(slug: str, page: int) -> str:
    if page <= 1:
        return _category_url(slug)
    return f"{_category_url(slug)}/PageN/{page}"


def parse_category(
    fetcher: Fetcher, cat: CategoryRef, limit: Optional[int] = None
) -> Iterator[ScrapedProduct]:
    """Генератор товаров категории по страницам пагинации до пустой страницы."""
    emitted = 0
    seen_ids: set[str] = set()
    for page in range(1, MAX_PAGES_PER_CATEGORY + 1):
        url = _page_url(cat.slug, page)
        try:
            html = fetcher.fetch(url)
        except SiteUnavailableError:
            raise
        except Exception as e:
            log.warning("Страница %s не загрузилась (%s) — пропуск", url, e)
            break

        products = list(_parse_listing_html(html, base_url=BASE_URL, slug=cat.slug))
        if not products:
            log.debug("Категория %s: пустая страница %d — конец пагинации",
                      cat.slug, page)
            break

        new_on_page = 0
        for p in products:
            if p.external_id in seen_ids:
                continue
            seen_ids.add(p.external_id)
            new_on_page += 1
            yield p
            emitted += 1
            if limit is not None and emitted >= limit:
                log.debug("Категория %s: достигнут limit=%d", cat.slug, limit)
                return
        if new_on_page == 0:
            # Все товары на странице уже были — защита от зацикленной пагинации.
            log.debug("Категория %s: на стр. %d нет новых товаров — стоп",
                      cat.slug, page)
            break
    log.info("Категория %s: собрано %d товаров", cat.slug, emitted)


def _parse_listing_html(
    html: str, base_url: str, slug: str
) -> Iterator[ScrapedProduct]:
    """Извлечь товары из HTML листинга. Несколько стратегий по убыванию надёжности.

    TODO(live): на живом mc.ru подтвердить реальные селекторы строк товара.
    Сейчас стратегии идут в порядке: (1) строки таблицы tr с ценой,
    (2) карточки-контейнеры со ссылкой на товар, (3) регэксп по тексту блоков.
    Какая сработает — зависит от вёрстки, которую нужно увидеть вживую.
    """
    soup = BeautifulSoup(html, "lxml")

    # --- Стратегия 1: таблица (tr/td) ---
    rows_found = 0
    for tr in soup.select("tr"):
        text = _clean(tr.get_text(" "))
        if not text:
            continue
        price = parse_price(text)
        if price is None:
            continue
        # Имя — обычно первая ссылка в строке, либо самый длинный td.
        link = tr.find("a", href=True)
        href = link["href"] if link else None
        name = None
        if link:
            name = _clean(link.get_text(" "))
        if not name:
            # самый длинный текстовый td как имя
            tds = [_clean(td.get_text(" ")) for td in tr.find_all("td")]
            tds = [t for t in tds if t]
            if tds:
                name = max(tds, key=len)
        if not name or len(name) < 4:
            continue
        yield _build_product(name, price, text, href, base_url, slug)
        rows_found += 1
    if rows_found:
        return

    # --- Стратегия 2: карточки-контейнеры со ссылкой на товар ---
    # Контейнеры, внутри которых есть ссылка и текст с ценой.
    cards_found = 0
    candidates = soup.select(
        "[class*=product], [class*=item], [class*=card], [class*=catalog], li"
    )
    for node in candidates:
        text = _clean(node.get_text(" "))
        if not text:
            continue
        price = parse_price(text)
        if price is None:
            continue
        link = node.find("a", href=True)
        if not link:
            continue
        name = _clean(link.get_text(" ")) or _clean(node.get("title"))
        if not name or len(name) < 4:
            continue
        yield _build_product(name, price, text, link["href"], base_url, slug)
        cards_found += 1
    if cards_found:
        return

    # --- Стратегия 3: регэксп по ссылкам товаров + ближайшая цена ---
    # Последний рубеж: пройтись по ссылкам, похожим на товар, и взять цену из
    # текста родителя.
    link_rx = re.compile(r"/metalloprokat/" + re.escape(slug) + r"/", re.IGNORECASE)
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if not link_rx.search(href):
            continue
        name = _clean(link.get_text(" "))
        if not name or len(name) < 4:
            continue
        parent = link.find_parent()
        ptext = _clean(parent.get_text(" ")) if parent else name
        price = parse_price(ptext or "")
        if price is None:
            continue
        yield _build_product(name, price, ptext, href, base_url, slug)


def _slug_from_href(href: Optional[str], base_url: str) -> Optional[str]:
    if not href:
        return None
    path = href.split("?")[0].split("#")[0].rstrip("/")
    last = path.rsplit("/", 1)[-1] if "/" in path else path
    # отбрасываем технические сегменты пагинации
    if not last or last.lower().startswith("pagen") or last.isdigit():
        return None
    if not re.match(r"^[a-z0-9_\-]+$", last, re.IGNORECASE):
        return None
    return last


def _abs_url(href: Optional[str], base_url: str) -> Optional[str]:
    if not href:
        return None
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return base_url + href
    return base_url + "/" + href


def _build_product(
    name: str,
    price: Decimal,
    context_text: str,
    href: Optional[str],
    base_url: str,
    cat_slug: str,
) -> ScrapedProduct:
    product_slug = _slug_from_href(href, base_url)
    slug_for_fields = product_slug or ""
    unit = detect_unit(context_text, slug_for_fields)
    in_stock = bool(RE_IN_STOCK.search(context_text))
    stock_text = "в наличии" if in_stock else None
    return ScrapedProduct(
        name=name,
        base_price=price,
        unit=unit,
        size=extract_size(name, slug_for_fields),
        steel_grade=extract_grade(name, slug_for_fields),
        gost=extract_gost(name),
        length=extract_length(name, slug_for_fields),
        in_stock=in_stock,
        stock_text=stock_text,
        source_url=_abs_url(href, base_url),
        product_slug=product_slug,
    )


# ============================================================================
# Наценка (зеркало src/lib/pricing.ts)
# ============================================================================

def apply_markup(base: Decimal, pct: float) -> Decimal:
    """final = round(base * (1 + pct/100), 2). round-half-up как в JS Math.round
    для положительных значений (цены всегда > 0)."""
    result = base * (Decimal(1) + (Decimal(str(pct)) / Decimal(100)))
    return result.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def resolve_markup(
    product_pct: Optional[float],
    category_pct: Optional[float],
    default_pct: float,
) -> float:
    if product_pct is not None:
        return product_pct
    if category_pct is not None:
        return category_pct
    return default_pct


# ============================================================================
# Слой БД (psycopg3, raw SQL, параметризовано)
# ============================================================================

def _now() -> datetime:
    return datetime.now(timezone.utc)


class Database:
    def __init__(self, dsn: str = DATABASE_URL):
        # Prisma добавляет ?schema=public в URL; psycopg это переварит.
        self.conn = psycopg.connect(dsn, autocommit=False)

    def close(self):
        try:
            self.conn.close()
        except Exception:
            pass

    # -- наценки --
    def get_default_markup(self) -> float:
        with self.conn.cursor() as cur:
            cur.execute(
                'SELECT value FROM "Setting" WHERE key = %s',
                ("default_markup_percent",),
            )
            row = cur.fetchone()
        if row and row[0] is not None:
            try:
                return float(str(row[0]).replace(",", "."))
            except ValueError:
                pass
        return DEFAULT_MARKUP_PERCENT

    # -- категории --
    def upsert_category(self, ref: CategoryRef) -> tuple[int, Optional[float]]:
        """Создать/обновить категорию по slug. Вернуть (id, markupPercent)."""
        now = _now()
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Category" (slug, name, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE
                    SET name = EXCLUDED.name,
                        "updatedAt" = EXCLUDED."updatedAt"
                RETURNING id, "markupPercent"
                """,
                (ref.slug, ref.name, now, now),
            )
            cid, markup = cur.fetchone()
        return cid, (float(markup) if markup is not None else None)

    def ensure_placeholder_category(self) -> tuple[int, Optional[float]]:
        ref = CategoryRef(
            slug="mc-selftest",
            name="Self-test (mc.ru parser)",
            url=_category_url("mc-selftest"),
        )
        return self.upsert_category(ref)

    # -- товарная наценка (не затирать) --
    def get_product_markup(self, external_id: str) -> Optional[float]:
        with self.conn.cursor() as cur:
            cur.execute(
                'SELECT "markupPercent" FROM "Product" WHERE "externalId" = %s',
                (external_id,),
            )
            row = cur.fetchone()
        if row and row[0] is not None:
            return float(row[0])
        return None

    def upsert_product(
        self,
        p: ScrapedProduct,
        category_id: int,
        category_markup: Optional[float],
        default_markup: float,
        price_with_vat: bool,
    ) -> None:
        """Идемпотентный upsert по externalId.

        markupPercent товара НЕ трогаем при апдейте: при INSERT кладём NULL,
        при UPDATE оставляем существующее значение (COALESCE на стороне SQL не
        нужен — мы просто не перечисляем колонку markupPercent в UPDATE SET).
        finalPrice считаем по эффективной наценке (приоритет: товарная, если она
        уже задана в БД, иначе категорийная, иначе глобальная).
        """
        existing_markup = self.get_product_markup(p.external_id)
        eff_pct = resolve_markup(existing_markup, category_markup, default_markup)
        final_price = apply_markup(p.base_price, eff_pct)
        now = _now()

        # stockText: если пусто, но есть длина/размер — оставляем как есть (None).
        stock_text = p.stock_text

        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Product" (
                    "externalId", slug, name, "categoryId",
                    size, "steelGrade", gost, unit,
                    "basePrice", "markupPercent", "finalPrice", "priceWithVat",
                    "inStock", "stockText", "sourceUrl", "lastScrapedAt",
                    "isActive", "createdAt", "updatedAt"
                )
                VALUES (
                    %(ext)s, %(slug)s, %(name)s, %(cat)s,
                    %(size)s, %(grade)s, %(gost)s, %(unit)s,
                    %(base)s, NULL, %(final)s, %(vat)s,
                    %(instock)s, %(stocktext)s, %(srcurl)s, %(scraped)s,
                    TRUE, %(now)s, %(now)s
                )
                ON CONFLICT ("externalId") DO UPDATE SET
                    name          = EXCLUDED.name,
                    "categoryId"  = EXCLUDED."categoryId",
                    size          = EXCLUDED.size,
                    "steelGrade"  = EXCLUDED."steelGrade",
                    gost          = EXCLUDED.gost,
                    unit          = EXCLUDED.unit,
                    "basePrice"   = EXCLUDED."basePrice",
                    "finalPrice"  = EXCLUDED."finalPrice",
                    "priceWithVat"= EXCLUDED."priceWithVat",
                    "inStock"     = EXCLUDED."inStock",
                    "stockText"   = EXCLUDED."stockText",
                    "sourceUrl"   = EXCLUDED."sourceUrl",
                    "lastScrapedAt"= EXCLUDED."lastScrapedAt",
                    "isActive"    = TRUE,
                    "updatedAt"   = EXCLUDED."updatedAt"
                    -- ВНИМАНИЕ: "markupPercent" и slug намеренно НЕ обновляем
                """,
                {
                    "ext": p.external_id,
                    "slug": p.db_slug,
                    "name": p.name,
                    "cat": category_id,
                    "size": p.size,
                    "grade": p.steel_grade,
                    "gost": p.gost,
                    "unit": p.unit,
                    "base": p.base_price,
                    "final": final_price,
                    "vat": price_with_vat,
                    "instock": p.in_stock,
                    "stocktext": stock_text,
                    "srcurl": p.source_url,
                    "scraped": now,
                    "now": now,
                },
            )

    def deactivate_stale(self, category_id: int, seen_external_ids: set[str]) -> int:
        """Погасить товары mc-* этой категории, не встреченные в прогоне.

        Сидовые seed-* не трогаем (фильтр по префиксу mc-).
        """
        if seen_external_ids:
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE "Product"
                       SET "isActive" = FALSE, "updatedAt" = %s
                     WHERE "categoryId" = %s
                       AND "externalId" LIKE 'mc-%%'
                       AND "isActive" = TRUE
                       AND NOT ("externalId" = ANY(%s))
                    """,
                    (_now(), category_id, list(seen_external_ids)),
                )
                return cur.rowcount
        else:
            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE "Product"
                       SET "isActive" = FALSE, "updatedAt" = %s
                     WHERE "categoryId" = %s
                       AND "externalId" LIKE 'mc-%%'
                       AND "isActive" = TRUE
                    """,
                    (_now(), category_id),
                )
                return cur.rowcount

    # -- ScrapeRun --
    def start_run(self) -> int:
        now = _now()
        with self.conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "ScrapeRun" ("startedAt", status)
                VALUES (%s, 'RUNNING'::"ScrapeStatus")
                RETURNING id
                """,
                (now,),
            )
            run_id = cur.fetchone()[0]
        self.conn.commit()
        return run_id

    def finish_run(
        self,
        run_id: int,
        status: str,
        products_found: int = 0,
        products_upserted: int = 0,
        categories_found: int = 0,
        error_text: Optional[str] = None,
    ) -> None:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "ScrapeRun"
                   SET "finishedAt" = %s,
                       status = %s::"ScrapeStatus",
                       "productsFound" = %s,
                       "productsUpserted" = %s,
                       "categoriesFound" = %s,
                       "errorText" = %s
                 WHERE id = %s
                """,
                (
                    _now(), status, products_found, products_upserted,
                    categories_found, error_text, run_id,
                ),
            )
        self.conn.commit()


# ============================================================================
# Self-test (доказывает путь записи в БД без mc.ru)
# ============================================================================

def run_self_test() -> int:
    log.info("=== SELF-TEST: проверка коннекта к БД и маппинга колонок ===")
    db = Database()
    run_id = db.start_run()
    log.info("ScrapeRun #%d создан (RUNNING)", run_id)
    try:
        cat_id, cat_markup = db.ensure_placeholder_category()
        log.info("Категория-заглушка mc-selftest: id=%d markup=%s",
                 cat_id, cat_markup)
        default_markup = db.get_default_markup()
        log.info("Глобальная наценка (Setting/env): %s%%", default_markup)

        synthetic = ScrapedProduct(
            name="Уголок 30х30х3 Ст3сп ГОСТ 8509-93 дл 12 м (SELF-TEST)",
            base_price=Decimal("54200.00"),
            unit="т",
            in_stock=True,
            stock_text="в наличии",
            source_url=f"{BASE_URL}/metalloprokat/mc-selftest/selftest-1",
            product_slug="selftest-1",
        )
        # Прогон извлекателей полей (демонстрация работы регэкспов).
        synthetic.size = extract_size(synthetic.name)
        synthetic.steel_grade = extract_grade(synthetic.name)
        synthetic.gost = extract_gost(synthetic.name)
        synthetic.length = extract_length(synthetic.name)
        log.info(
            "Извлечено из имени: size=%s grade=%s gost=%s length=%s unit=%s ext_id=%s",
            synthetic.size, synthetic.steel_grade, synthetic.gost,
            synthetic.length, synthetic.unit, synthetic.external_id,
        )

        db.upsert_product(
            synthetic, cat_id, cat_markup, default_markup, PRICE_INCLUDES_VAT
        )
        db.conn.commit()

        # Верификация записи.
        with db.conn.cursor() as cur:
            cur.execute(
                'SELECT "externalId", name, "basePrice", "finalPrice", unit, '
                '"inStock", "isActive" FROM "Product" WHERE "externalId" = %s',
                (synthetic.external_id,),
            )
            row = cur.fetchone()
        if not row:
            raise ScraperError("Запись mc-selftest-1 не найдена после upsert!")

        expected_final = apply_markup(synthetic.base_price, default_markup)
        log.info("ЗАПИСЬ В БД ОК: %s", dict(zip(
            ["externalId", "name", "basePrice", "finalPrice", "unit",
             "inStock", "isActive"], row)))
        log.info("Проверка наценки: base=%s × (1+%s%%) = %s (в БД: %s)",
                 synthetic.base_price, default_markup, expected_final, row[3])
        assert Decimal(str(row[3])) == expected_final, "finalPrice не совпал!"

        db.finish_run(
            run_id, "SUCCESS",
            products_found=1, products_upserted=1, categories_found=1,
        )
        log.info("ScrapeRun #%d → SUCCESS", run_id)
        log.info("=== SELF-TEST ПРОЙДЕН. Запись в БД и маппинг колонок работают. ===")
        log.info(
            "Очистка (опционально): "
            "docker exec metalshop_db psql -U metal -d metalshop -c "
            "\"DELETE FROM \\\"Product\\\" WHERE \\\"externalId\\\"='%s'; "
            "DELETE FROM \\\"Category\\\" WHERE slug='mc-selftest';\"",
            synthetic.external_id,
        )
        return 0
    except Exception as e:
        log.exception("SELF-TEST упал")
        try:
            db.conn.rollback()
            db.finish_run(run_id, "FAILED", error_text=f"self-test: {e}")
        except Exception:
            pass
        return 1
    finally:
        db.close()


# ============================================================================
# Основной прогон
# ============================================================================

def run_scrape(
    only_category: Optional[str] = None,
    limit: Optional[int] = None,
    dry_run: bool = False,
) -> int:
    fetcher = Fetcher()
    db: Optional[Database] = None
    run_id: Optional[int] = None

    # ScrapeRun стартуем всегда (даже в dry-run? — нет: в dry-run в БД не пишем).
    if not dry_run:
        db = Database()
        run_id = db.start_run()
        log.info("ScrapeRun #%d (RUNNING)", run_id)

    products_found = 0
    products_upserted = 0
    categories_found = 0

    try:
        # 1. Discovery категорий.
        if only_category:
            cats = [CategoryRef(
                slug=only_category,
                name=only_category.replace("_", " ").capitalize(),
                url=_category_url(only_category),
            )]
            log.info("Режим одной категории: %s", only_category)
        else:
            cats = discover_categories(fetcher)
        categories_found = len(cats)

        default_markup = db.get_default_markup() if db else DEFAULT_MARKUP_PERCENT
        log.info("Категорий к обработке: %d. Глобальная наценка: %s%%",
                 categories_found, default_markup)

        # 2. По каждой категории.
        for cat in cats:
            if db:
                cat_id, cat_markup = db.upsert_category(cat)
                db.conn.commit()
            else:
                cat_id, cat_markup = -1, None

            seen_ids: set[str] = set()
            cat_count = 0
            for p in parse_category(fetcher, cat, limit=limit):
                products_found += 1
                cat_count += 1
                seen_ids.add(p.external_id)
                if dry_run:
                    _print_dry(cat, p, default_markup, cat_markup)
                else:
                    db.upsert_product(  # type: ignore
                        p, cat_id, cat_markup, default_markup, PRICE_INCLUDES_VAT
                    )
                    products_upserted += 1

            if db:
                db.conn.commit()
                deactivated = db.deactivate_stale(cat_id, seen_ids)
                db.conn.commit()
                if deactivated:
                    log.info("Категория %s: погашено устаревших mc-* товаров: %d",
                             cat.slug, deactivated)

        # 3. Финал.
        if db and run_id is not None:
            db.finish_run(
                run_id, "SUCCESS",
                products_found=products_found,
                products_upserted=products_upserted,
                categories_found=categories_found,
            )
            log.info("ScrapeRun #%d → SUCCESS (found=%d, upserted=%d, cats=%d)",
                     run_id, products_found, products_upserted, categories_found)
        else:
            log.info("DRY-RUN завершён: found=%d (в БД не записано), cats=%d",
                     products_found, categories_found)
        return 0

    except SiteUnavailableError as e:
        # ШТАТНАЯ обработка TLS-блока — без traceback.
        msg = (
            "mc.ru недоступен из этой среды (похоже на TLS-блок нераспознанного "
            "фингерпринта/датацентрового IP). Проверьте парсер с целевого VPS, "
            "желательно с российским IP. Детали: %s" % e
        )
        log.error(msg)
        if db and run_id is not None:
            db.finish_run(
                run_id, "FAILED",
                products_found=products_found,
                products_upserted=products_upserted,
                categories_found=categories_found,
                error_text=msg,
            )
            log.error("ScrapeRun #%d → FAILED", run_id)
        return 2  # ненулевой код для cron-мониторинга

    except Exception as e:
        log.exception("Прогон упал с неожиданной ошибкой")
        if db and run_id is not None:
            try:
                db.conn.rollback()
            except Exception:
                pass
            db.finish_run(
                run_id, "FAILED",
                products_found=products_found,
                products_upserted=products_upserted,
                categories_found=categories_found,
                error_text=f"{type(e).__name__}: {e}",
            )
            log.error("ScrapeRun #%d → FAILED", run_id)
        return 1

    finally:
        fetcher.close()
        if db:
            db.close()


def _print_dry(
    cat: CategoryRef,
    p: ScrapedProduct,
    default_markup: float,
    cat_markup: Optional[float],
) -> None:
    eff = resolve_markup(None, cat_markup, default_markup)
    final = apply_markup(p.base_price, eff)
    print(
        f"[{cat.slug}] {p.name}\n"
        f"    ext_id={p.external_id} unit={p.unit} "
        f"base={p.base_price} → final={final} (наценка {eff}%)\n"
        f"    size={p.size} grade={p.steel_grade} gost={p.gost} "
        f"length={p.length} in_stock={p.in_stock}\n"
        f"    url={p.source_url}"
    )


# ============================================================================
# CLI
# ============================================================================

def build_arg_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Парсер цен металлопроката mc.ru (СПб) → PostgreSQL сайта.",
    )
    ap.add_argument(
        "--self-test", action="store_true",
        help="Записать синтетический товар mc-selftest-1: проверка БД и маппинга "
             "колонок (без обращения к mc.ru).",
    )
    ap.add_argument(
        "--dry-run", action="store_true",
        help="Спарсить и напечатать образцы товаров БЕЗ записи в БД.",
    )
    ap.add_argument(
        "--category", metavar="SLUG", default=None,
        help="Обработать только одну категорию по её slug на mc.ru.",
    )
    ap.add_argument(
        "--limit", type=int, default=None, metavar="N",
        help="Ограничить число товаров на категорию (для отладки).",
    )
    return ap


def setup_logging() -> None:
    level = getattr(logging, LOG_LEVEL, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def main(argv: Optional[list[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)
    setup_logging()

    log.info(
        "Старт. engine=%s base=%s region=%s vat=%s delay=%ss maxpages=%d",
        SCRAPER_ENGINE, BASE_URL, REGION, PRICE_INCLUDES_VAT,
        REQUEST_DELAY, MAX_PAGES_PER_CATEGORY,
    )

    if args.self_test:
        return run_self_test()

    return run_scrape(
        only_category=args.category,
        limit=args.limit,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
