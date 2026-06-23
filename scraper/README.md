# Парсер цен металлопроката mc.ru → metal-shop

Python-парсер, который раз в сутки (cron) тянет товары металлопроката с сайта
**mc.ru** (МЕТАЛЛСЕРВИС, филиал Санкт-Петербург), извлекает характеристики
(размер, марка стали, ГОСТ, длина, единица, наличие), применяет наценку по той
же формуле, что и сайт, и пишет результат в **тот же PostgreSQL**, который
использует Next.js-сайт (Prisma-схема `metalshop`).

---

## ⚠️ КРИТИЧНО: TLS-блок mc.ru — проверять с целевого VPS (желательно RU-IP)

Сайт mc.ru **молча обрывает TLS-handshake на :443** для нераспознанного
JA3/JA4-фингерпринта и/или датацентровых/иностранных IP. Симптом: обычные
`requests` / `httpx` / `urllib` / системный `curl` / Playwright-с-датацентра
**зависают на handshake** (при этом порт 80 отвечает 301→https, Microsoft-IIS).

Поэтому парсер **первым выбором** использует [`curl_cffi`](https://github.com/lexiforest/curl_cffi)
— биндинг `curl-impersonate`, который копирует TLS-фингерпринт Chrome. Именно
это фильтр пропускает.

**Из локальной dev-среды (особенно не из РФ) mc.ru, скорее всего, недоступен —
это ОЖИДАЕМО.** Парсер обрабатывает блок штатно: ловит сетевую ошибку, пишет
понятное сообщение, помечает `ScrapeRun = FAILED` с `errorText`, выходит с кодом
`2` — **без необработанного traceback**. Чтобы реально собирать данные, парсер
надо запускать **с того же VPS, где живёт сайт, желательно с российским IP**.

### Быстрый тест доступности mc.ru (выполнить на VPS)

```bash
python -c "from curl_cffi import requests as r; print(r.get('https://mc.ru/products/speterburg', impersonate='chrome', timeout=30).status_code)"
```

- `200` → доступ есть, можно парсить.
- Зависание/таймаут/ConnectionError → TLS-блок не пробит этим IP/профилем.
  Варианты: (а) другой `IMPERSONATE` (`chrome120`/`chrome110`/`safari`);
  (б) RU-прокси через `HTTP_PROXY`/`HTTPS_PROXY`; (в) движок Playwright
  (`SCRAPER_ENGINE=playwright`).

---

## Как устроено

| Этап | Что делает |
|------|------------|
| `Fetcher.fetch()` | Загрузка страницы выбранным движком с ретраями (tenacity), троттлингом (`REQUEST_DELAY`) и реалистичными заголовками. curl_cffi перебирает несколько профилей имперсонации; при полном провале — ленивый фолбэк на Playwright. |
| `discover_categories()` | Грузит `/products/<region>`, вытаскивает ссылки `/(region/<region>/)?metalloprokat/<slug>`. При неудаче — фолбэк на зашитый список подтверждённых slug. |
| `parse_category()` | Генератор товаров по страницам пагинации `/metalloprokat/<slug>/PageN/<N>` до пустой страницы (или `MAX_PAGES_PER_CATEGORY`). |
| `_parse_listing_html()` | **Защитный** парсинг: 3 стратегии по убыванию надёжности — строки таблицы `tr/td` → карточки-контейнеры → регэксп по ссылкам товаров. |
| извлечение полей | Регэкспами из наименования (и слага как запасного источника): размер, марка, ГОСТ/ТУ, длина, единица, наличие. |
| наценка | Читает глобальную из `Setting('default_markup_percent')` (иначе env/10). Приоритет: **товар > категория > глобальная**. Формула — зеркало `src/lib/pricing.ts`: `final = round(base × (1 + pct/100), 2)`. |
| upsert | `Category` по `slug`, `Product` по `externalId` (`mc-<slug-товара>` или `mc-<hash>`). При апдейте **`markupPercent` товара и `slug` НЕ трогаются**. |
| устаревание | Товары `mc-*` категории, не встреченные в прогоне, → `isActive=false`. Сидовые `seed-*` не трогаются. |
| `ScrapeRun` | Лог прогона: `RUNNING` на старте → `SUCCESS`/`FAILED`, с `productsFound`, `productsUpserted`, `categoriesFound`, `errorText`. |

Контент на mc.ru server-rendered (SSR) — JS для парсинга не нужен, читаем готовый
HTML через BeautifulSoup + lxml. Playwright (если включён) используется **не ради
JS**, а только как гарантированный обход TLS.

---

## Установка и запуск (локально)

```bash
cd /Users/andreyyachmenkov/metal-shop
python3.12 -m venv scraper/.venv
scraper/.venv/bin/pip install -r scraper/requirements.txt
cp scraper/.env.example scraper/.env   # при необходимости отредактировать
```

Переменные окружения берутся из среды процесса (см. `.env.example`). При запуске
через cron/Docker подставьте их явно или через `--env-file`.

### Команды

```bash
# 1) Проверка коннекта к БД и маппинга колонок (БЕЗ обращения к mc.ru).
#    Пишет синтетический товар mc-selftest-1 и категорию mc-selftest.
scraper/.venv/bin/python scraper/scraper.py --self-test

# 2) Парсинг с печатью образцов, БЕЗ записи в БД (попытается достучаться до mc.ru).
scraper/.venv/bin/python scraper/scraper.py --dry-run --limit 5

# 3) Боевой прогон одной категории.
scraper/.venv/bin/python scraper/scraper.py --category armatura_katanka

# 4) Полный боевой прогон (все категории, запись в БД).
scraper/.venv/bin/python scraper/scraper.py
```

Коды выхода: `0` — успех; `2` — mc.ru недоступен (TLS-блок, штатно); `1` — иная
ошибка.

### Очистка тестовых данных self-test

```bash
docker exec metalshop_db psql -U metal -d metalshop -c \
  "DELETE FROM \"Product\" WHERE \"externalId\"='mc-selftest-1'; \
   DELETE FROM \"Category\" WHERE slug='mc-selftest';"
```

---

## Запуск в cron (раз в сутки)

Пример: каждый день в 06:30 по серверному времени, лог в файл.

```cron
30 6 * * * cd /opt/metal-shop && \
  DATABASE_URL='postgresql://metal:metal@localhost:5433/metalshop' \
  SCRAPER_ENGINE=curl_cffi \
  /opt/metal-shop/scraper/.venv/bin/python /opt/metal-shop/scraper/scraper.py \
  >> /var/log/mc-scraper.log 2>&1
```

Мониторинг: ненулевой код выхода (`1`/`2`) сигнализирует о проблеме; статус и
`errorText` каждого прогона видны в таблице `ScrapeRun`.

---

## Запуск через Docker

```bash
# Сборка
docker build -t mc-scraper scraper/

# Self-test (DATABASE_URL должен указывать на доступный из контейнера Postgres;
# для локального docker-compose используйте host.docker.internal или общую сеть).
docker run --rm --env-file scraper/.env mc-scraper --self-test

# Боевой прогон
docker run --rm --env-file scraper/.env mc-scraper

# Dry-run
docker run --rm --env-file scraper/.env mc-scraper --dry-run --limit 5
```

> При подключении к Postgres из docker-compose проекта: либо запускайте контейнер
> в той же сети (`--network metal-shop_default` и `DATABASE_URL=...@db:5432/...`),
> либо используйте `--add-host=host.docker.internal:host-gateway` и
> `DATABASE_URL=...@host.docker.internal:5433/...`.

Cron + Docker: оберните `docker run ...` в ту же crontab-строку.

### Переключение на Playwright (если curl_cffi не пробивает TLS)

См. подробный комментарий в конце `Dockerfile`. Кратко:
1. Раскомментировать `playwright` в `requirements.txt`.
2. Базовый образ → `mcr.microsoft.com/playwright/python:v1.44.0-jammy`
   (или `RUN playwright install --with-deps chromium`).
3. Запускать с `SCRAPER_ENGINE=playwright`.

---

## Что потребует подстройки на живом сайте

Парсинг написан **защитно** (несколько стратегий), но точные селекторы и формат
текста можно подтвердить только на живом mc.ru. На VPS проверьте и при
необходимости поправьте (все места помечены `TODO(live)` в `scraper.py`):

1. **Разметка корня категорий** (`discover_categories`): убедиться, что ссылки
   категорий действительно вида `/(region/speterburg/)?metalloprokat/<slug>`.
   Если они в конкретном блоке (`nav`/`aside`/меню) — сузить поиск.
2. **Селекторы строк товара** (`_parse_listing_html`): какая из 3 стратегий
   (таблица `tr/td` / карточки / регэксп по ссылкам) реально срабатывает —
   зависит от вёрстки листинга. Возможно, понадобится точный CSS-селектор
   строки/карточки и цены.
3. **Формат пагинации**: подтвердить `/metalloprokat/<slug>/PageN/<N>` (или
   альтернативный префикс `/region/speterburg/...`) и признак последней страницы.
4. **Формат цены и единицы**: маркеры `от <число> руб ... за (тонну|кг|метр|шт)`.
   Уточнить регэксп `RE_PRICE`/`RE_UNIT_MARKER`, если разметка цены иная
   (напр. цена в отдельном атрибуте/спане без слова «руб»).
5. **НДС**: на живой странице проверить, включает ли цена НДС, и при
   необходимости переключить `PRICE_INCLUDES_VAT`.
6. **Регэкспы полей** (`RE_GRADE`, `RE_SIZE_*`, `RE_GOST`, `RE_LENGTH`):
   проверены на типичных наименованиях, но реальные строки mc.ru могут содержать
   нестандартные обозначения марок/типоразмеров — дополнить по факту.
```
