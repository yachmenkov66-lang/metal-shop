# ============================================================================
# Парсер mc.ru — образ для запуска по cron (раз в сутки) или вручную.
# Базовый вариант: curl_cffi (обход TLS-фильтра mc.ru имперсонацией Chrome).
# Playwright НЕ ставится по умолчанию — см. блок в конце про переключение.
# ============================================================================
FROM python:3.12-slim

# Системные зависимости:
#   - libcurl4 + ca-certificates: для curl_cffi (биндинг curl-impersonate).
#   - libxml2/libxslt1.1: рантайм для lxml (парсинг HTML).
#   - tzdata: корректная таймзона в логах/cron.
# build-essential НЕ нужен: ставим колёса (wheels), включая psycopg[binary].
RUN apt-get update && apt-get install -y --no-install-recommends \
        libcurl4 \
        ca-certificates \
        libxml2 \
        libxslt1.1 \
        tzdata \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Europe/Moscow \
    SCRAPER_ENGINE=curl_cffi

WORKDIR /app

# Сначала зависимости — кэш слоёв.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scraper.py .

# По умолчанию — обычный прогон (discovery + парсинг + запись в БД).
# Переопределяйте аргументы при запуске, напр.:
#   docker run --rm --env-file .env mc-scraper --dry-run --limit 5
#   docker run --rm --env-file .env mc-scraper --self-test
ENTRYPOINT ["python", "scraper.py"]
CMD []

# ----------------------------------------------------------------------------
# ПЕРЕКЛЮЧЕНИЕ НА PLAYWRIGHT (гарантированный обход TLS, если curl_cffi не зашёл):
#   1) В requirements.txt раскомментируйте строку `playwright>=1.44`.
#   2) Замените базовый образ на готовый с браузерами и зависимостями:
#        FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy
#      (в нём уже есть chromium и все системные либы; шаги apt-get выше можно
#       убрать). Либо оставьте python:3.12-slim и добавьте после pip install:
#        RUN playwright install --with-deps chromium
#   3) Запускайте с переменной окружения SCRAPER_ENGINE=playwright.
# ----------------------------------------------------------------------------
