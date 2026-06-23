# SPEC — metal-shop (контракт для разработки)

Интернет-магазин металлопроката (B2B + B2C), Санкт-Петербург. UI на русском.
Данные парсятся с mc.ru ежедневно с наценкой; корзина → заявка/счёт (без онлайн-оплаты).

## Стек и версии (ВАЖНО: свежие, есть отличия от старых знаний)
- **Next.js 16.2.9** (App Router, Turbopack), **React 19**, TypeScript, `src/` dir, alias `@/* → src/*`.
- **Tailwind CSS v4** — конфиг в CSS через `@theme` в `src/app/globals.css`. НЕТ `tailwind.config.js`.
  - `@utility` НЕЛЬЗЯ вкладывать в `@media`. Для адаптивного — обычные классы.
- **Prisma 6** + PostgreSQL (в Docker, порт 5433). Клиент сгенерирован.
- Установлены: `bcryptjs`, `jose`, `zod`, `lucide-react`, `clsx`. **Новые зависимости НЕ ставить** без крайней нужды.

## Next.js 16 — критичные правила
- `params` и `searchParams` в page/layout — **Promise**, их надо `await`:
  ```ts
  export default async function Page({ params, searchParams }: {
    params: Promise<{ category: string }>,
    searchParams: Promise<{ [k: string]: string | string[] | undefined }>,
  }) {
    const { category } = await params;
    const sp = await searchParams;
  }
  ```
- `cookies()`, `headers()` из `next/headers` — **async** (`await cookies()`). Менять cookie можно только в Route Handler / Server Action.
- Middleware переименован в Proxy. **Мы НЕ используем middleware** — защита страниц через server-guard в layout (см. `requireUser`/`requireAdmin`).
- Server Components по умолчанию; `"use client"` только для интерактива (формы с состоянием, корзина).
- Route Handlers: `src/app/api/.../route.ts`, экспорт `GET`/`POST`/...; использовать `NextRequest`/`NextResponse` из `next/server`, возвращать `NextResponse.json(...)`.
- Деньги в DTO — **number** (не Decimal). Prisma.Decimal конвертируем `Number(x)` на границе.

## Дизайн-система (уже готова — ИСПОЛЬЗОВАТЬ, не изобретать)
Цвета (Tailwind-классы): `ink` (#0f172a тёмный), `ink-deep` (#020617), `accent` (#ea580c оранжевый CTA/цены), `accent-hover`, `accent-soft` (#fff7ed), `steel` (#64748b втор. текст), `line` (#e2e8f0 границы), `surface` (#f8fafc подложка).
Примеры: `bg-ink text-white`, `text-accent`, `border-line`, `bg-surface`, `bg-accent-soft text-accent`.
- Контейнер: класс `container-x` (центрирует, max-w-7xl, паддинги).
- Карточки: `rounded-card` (0.875rem).
- Фон-сетка: класс `grid-bg`.
- Шрифт Geist с кириллицей подключён в layout. Заголовки — `font-extrabold tracking-tight`.

### Готовые компоненты (импортировать, НЕ дублировать)
- `@/components/ui/Button` → `Button` (onClick), `LinkButton` (href). props: `variant` = `primary|secondary|ghost|dark`, `size` = `sm|md|lg`. Есть `buttonClass(...)`.
- `@/components/ui/Stars` → `Stars` ({ rating, size? }).
- `@/components/catalog/CategoryIcon` → `CategoryIcon` ({ iconKey, size? }), и `iconBySlug[categorySlug]`.
- `@/components/catalog/ProductCardView` → `ProductCardView` ({ product: ProductCard }).
- `@/components/cart/AddToCart` → `AddToCart` ({ product: Omit<CartLine,'quantity'>, withQuantity?, size?, full? }).
- `@/components/cart/CartButton`, `@/components/cart/CartProvider` (см. ниже).
- `@/components/reviews/Reviews` → `Reviews` ({ reviews, stats }).
- Иконки — `lucide-react`.

## Библиотеки (src/lib) — публичные API
- `@/lib/db` → `prisma`.
- `@/lib/site` → `site` (бренд, контакты), `nav`.
- `@/lib/format` → `formatPrice(n)`→"12 500 ₽", `formatNumber`, `plural(n,one,few,many)`, `pluralWithCount`, `priceUnit(unit)`→"₽/т".
- `@/lib/auth` →
  - `getCurrentUser()` → user | null (поля: id,email,firstName,lastName,phone,telegram,role,companyName,inn).
  - `requireUser()` / `requireAdmin()` — для guard в layout (редиректят на /login).
  - `setSession({userId, role})`, `clearSession()`, `hashPassword(pw)`, `verifyPassword(pw,hash)`.
  - тип `CurrentUser`, `SessionPayload`.
- `@/lib/pricing` → `applyMarkup(base, pct)`, `resolveMarkup(prod, cat, def)`, `getDefaultMarkup()`, `recomputeFinalPrices(categoryId?)`, `SETTING_DEFAULT_MARKUP`, `DEFAULT_MARKUP_PERCENT`.
- `@/lib/queries` → `ProductCard` (тип DTO), `toCard`, `getCategoriesWithCounts`, `getCategoryBySlug`, `getCategoryProducts({categoryId?,q?,sort?,page?,pageSize?})`→{items,total,pages,page}, `getProductBySlug`, `getRelatedProducts`, `getReviews`, `getReviewStats`. `SortKey = popular|price_asc|price_desc|name`.
- `@/lib/validation` → `registerSchema`, `loginSchema`, `orderSchema`, `cartItemSchema` (zod).

## Корзина (клиентская, localStorage)
`@/components/cart/CartProvider` (уже в layout). Хук `useCart()`:
- `items: CartLine[]`, `ready: boolean`, `count`, `totalAmount`, `add(line, qty?)`, `setQty(id, qty)`, `remove(id)`, `clear()`.
- `CartLine = { productId, name, slug, unit, price, size?, steelGrade?, quantity }`.
- Заказ: отправлять `items:[{productId, quantity}]` на `/api/orders`; сервер ПЕРЕСЧИТЫВАЕТ цены из БД (не доверять клиентской цене), создаёт Order+OrderItems.

## Модели БД (Prisma) — ключевые поля
- **Category**: id, slug, name, description, iconKey, sortOrder, markupPercent(Decimal?), parentId, products[].
- **Product**: id, externalId(uniq), slug(uniq), name, categoryId, size, steelGrade, gost, unit, basePrice(Decimal), markupPercent(Decimal?), finalPrice(Decimal), priceWithVat, inStock, stockText, sourceUrl, lastScrapedAt, isActive.
- **User**: id, email(uniq), passwordHash, lastName, firstName, phone, telegram?, role(CUSTOMER|ADMIN), companyName?, inn?, orders[], cart?.
- **Order**: id, orderNumber(uniq), userId?, status(NEW|PROCESSING|INVOICED|COMPLETED|CANCELLED), customerName, phone, email?, telegram?, companyName?, inn?, comment?, totalAmount(Decimal), items[].
- **OrderItem**: id, orderId, productId?, productName, unit, quantity(Decimal), unitPrice(Decimal), lineTotal(Decimal).
- **Review**: id, authorName, rating(Int 4..5), text, source?, isPublished, sortOrder.
- **Setting**: key(id), value. Глобальная наценка: key=`default_markup_percent`.
- **ScrapeRun**: id, startedAt, finishedAt?, status(RUNNING|SUCCESS|FAILED), productsFound, productsUpserted, categoriesFound, errorText.

## Договорённости
- Весь видимый текст — на русском, тон деловой, продающий, сдержанный.
- Цены показывать `formatPrice`, единица `priceUnit(unit)`, помечать «с НДС» если `priceWithVat`.
- API ошибки: `NextResponse.json({ error: '...' }, { status })`. Успех: `{ ok:true, ... }`.
- Не трогать общие файлы: `src/lib/*`, `src/components/ui/*`, `src/components/cart/*`, `src/components/catalog/*`, `src/app/layout.tsx`, `src/app/globals.css`. Если нужна правка — описать в ответе, не делать молча.
- Админ для теста: `admin@stalhouse.ru` / `admin12345`.
