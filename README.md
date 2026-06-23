# СтальХауз — интернет-магазин металлопроката (СПб)

Сайт по продаже металлопроката (B2B + B2C) с ежедневным парсингом цен и наличия
с [mc.ru (МЕТАЛЛСЕРВИС)](https://mc.ru/products/speterburg) и автоматической наценкой.

## Возможности

- **Каталог** металлопроката с поиском, фильтрами (наличие), сортировкой и пагинацией.
- **Карточка товара** с характеристиками (марка, ГОСТ, размер), ценой и добавлением в корзину.
- **Корзина → заявка/счёт** (B2B-логика, без онлайн-оплаты): менеджер получает заявку и выставляет счёт. Можно оформить и без регистрации.
- **Личный кабинет**: регистрация (фамилия, имя, телефон, Telegram, почта + опц. компания/ИНН), история заявок.
- **Админ-панель** (`/admin`): управление **наценками** (глобальная / на категорию / на товар), товарами, статусами заявок.
- **Ежедневный парсер** mc.ru: тянет товары, применяет наценку, пишет в ту же БД (cron, 24/7 на VPS, без участия вашего компьютера).
- **Отзывы** (4★+) внизу страницы.

## Стек

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 6 · PostgreSQL · Python-парсер (curl_cffi + BeautifulSoup) · Docker.

## Быстрый старт (локально)

Требуется: Node 20+, Docker (или Colima на macOS).

```bash
# 1. Поднять Postgres
docker compose up -d db

# 2. Зависимости
npm install

# 3. Создать .env (см. ниже) и применить миграции
npx prisma migrate dev

# 4. Заполнить демо-данными (категории, ~114 товаров, отзывы, админ)
npm run db:seed

# 5. Запустить
npm run dev    # http://localhost:3000
```

`.env` для локальной разработки:

```env
DATABASE_URL="postgresql://metal:metal@localhost:5433/metalshop?schema=public"
JWT_SECRET="dev-only-secret-replace-in-production"
DEFAULT_MARKUP_PERCENT="10"
```

### Доступ в админку (после seed)

`admin@stalhouse.ru` / `admin12345` → **смените пароль после первого входа** (через регистрацию нового админа или прямо в БД).

## Как работают наценки

Итоговая цена = базовая (с mc.ru) × (1 + наценка%). Наценка резолвится по приоритету:

1. **на товар** (`Product.markupPercent`) — если задана;
2. иначе **на категорию** (`Category.markupPercent`);
3. иначе **глобальная** (`Setting.default_markup_percent`, по умолчанию **10%**).

Меняется в админке `/admin/markup` (глобальная и по категориям) и `/admin/products` (по товару).
При изменении пересчитывается `finalPrice` всех затронутых товаров — **без повторного парсинга**.
Хранятся и базовая, и итоговая цена раздельно.

## Где менять бренд и контакты

Один файл: [`src/lib/site.ts`](src/lib/site.ts) — название, телефон, e-mail, адрес, часы работы, ИНН/ОГРН, Telegram.

## Парсер mc.ru

Код в [`scraper/`](scraper/). Тянет данные раз в сутки по cron. См. [`scraper/README.md`](scraper/README.md) и [`DEPLOY.md`](DEPLOY.md).

> ⚠️ **Важно:** mc.ru имеет TLS-фильтр, блокирующий обычные HTTP-клиенты и датацентровые IP.
> Парсер использует `curl_cffi` (имитация TLS Chrome). Работоспособность нужно проверить
> **с целевого VPS** (желательно с российским IP) — подробности в `scraper/README.md`.

## Деплой на VPS (24/7)

Полная инструкция — [`DEPLOY.md`](DEPLOY.md). Кратко:

```bash
docker compose -f docker-compose.prod.yml up -d --build   # БД + веб
docker compose -f docker-compose.prod.yml run --rm web npx prisma db seed   # первичные данные
# + cron на ежедневный запуск парсера
```

## Структура

```
src/
  app/            маршруты (главная, /catalog, /product, /cart, /account, /admin, /api/*)
  components/     ui, layout, catalog, cart, reviews, account, admin
  lib/            db, auth, pricing, queries, validation, format, site
prisma/           schema.prisma, миграции, seed.ts
scraper/          Python-парсер mc.ru (curl_cffi + BeautifulSoup)
SPEC.md           технический контракт проекта
```
