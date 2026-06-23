# Деплой на VPS (работа 24/7 без вашего компьютера)

Стек разворачивается в Docker: PostgreSQL + веб-приложение + парсер (по cron).
После настройки всё крутится на сервере само — ваш Mac не нужен.

## 0. Что потребуется

- VPS (Ubuntu 22.04+), 2 ГБ RAM минимум. **Желательно с российским IP** — у mc.ru стоит фильтр, который может блокировать зарубежные/датацентровые адреса (см. раздел 5).
- Установленные на VPS: Docker и Docker Compose, git.
- (Опционально) домен + reverse-proxy для HTTPS.

```bash
# Установка Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh
```

## 1. Код и переменные окружения

```bash
git clone <ваш-репозиторий> /opt/metal-shop
cd /opt/metal-shop
cp .env.example .env
nano .env
```

Заполните `.env` (рядом с `docker-compose.prod.yml`):

```env
DB_PASSWORD=<сложный пароль БД>
JWT_SECRET=<случайная строка 32+ символов>   # openssl rand -base64 48
DEFAULT_MARKUP_PERCENT=10
WEB_PORT=3000
SCRAPER_ENGINE=curl_cffi
PRICE_INCLUDES_VAT=true
```

## 2. Запуск БД и веб-приложения

```bash
docker compose -f docker-compose.prod.yml up -d --build db web
```

Миграции БД применяются автоматически при старте контейнера `web`
(`prisma migrate deploy` в entrypoint).

## 3. Первичные данные (один раз)

Категории, демо-товары, отзывы и админ-аккаунт:

```bash
docker compose -f docker-compose.prod.yml run --rm web npx prisma db seed
```

После первого успешного прогона **парсера** (раздел 5) реальные товары
с mc.ru заменят/дополнят демо-данные. Демо-товары имеют `externalId` вида
`seed-*`, спарсенные — `mc-*`.

## 4. Доступ и безопасность

- Сайт: `http://<IP>:3000` (или через домен, раздел 6).
- Админка: `/admin`, вход `admin@stalhouse.ru` / `admin12345`.
- **Сразу смените пароль администратора** и контакты компании в `src/lib/site.ts`
  (затем пересоберите `web`, см. раздел 7).

## 5. Парсер mc.ru по расписанию (раз в сутки)

### 5.1 Сначала проверьте доступность с этого VPS

У mc.ru TLS-фильтр. Проверьте, что парсер вообще достучится:

```bash
docker compose -f docker-compose.prod.yml build scraper
docker compose -f docker-compose.prod.yml run --rm scraper python scraper.py --dry-run --limit 5
```

- Если выводятся товары — отлично, переходите к 5.2.
- Если «mc.ru недоступен (TLS-блок)» — VPS блокируется. Варианты:
  переключить `SCRAPER_ENGINE=playwright` в `.env`, или взять VPS с РФ-IP,
  или настроить российский прокси (см. `scraper/README.md`).

### 5.2 Проверьте запись в БД

```bash
docker compose -f docker-compose.prod.yml run --rm scraper python scraper.py --self-test
```

### 5.3 Боевой прогон и cron

```bash
# Разовый полный прогон
docker compose -f docker-compose.prod.yml run --rm scraper

# Поставить в cron на каждый день в 06:00
crontab -e
```

Добавьте строку:

```cron
0 6 * * * cd /opt/metal-shop && docker compose -f docker-compose.prod.yml run --rm scraper >> /var/log/metal-scraper.log 2>&1
```

Результаты каждого прогона видны в админке на дашборде (последний `ScrapeRun`)
и в `/var/log/metal-scraper.log`.

## 6. Домен и HTTPS (опционально, рекомендуется)

Reverse-proxy nginx + Let's Encrypt:

```nginx
server {
    server_name stalhouse.ru;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d stalhouse.ru
```

## 7. Обновление приложения

```bash
cd /opt/metal-shop
git pull
docker compose -f docker-compose.prod.yml up -d --build web
```

## 8. Резервные копии БД

```bash
# Бэкап
docker compose -f docker-compose.prod.yml exec db pg_dump -U metal metalshop > backup_$(date +%F).sql
# Восстановление
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U metal metalshop
```

## 9. Управление наценками

В админке `/admin/markup`:
- глобальная наценка (по умолчанию 10%);
- наценка на категорию (переопределяет глобальную);
- наценка на товар — в `/admin/products` (переопределяет всё).

Изменения мгновенно пересчитывают итоговые цены **без перепарсинга**.
