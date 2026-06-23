import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Home } from "lucide-react";
import {
  getCategoriesWithCounts,
  getCategoryProducts,
  type SortKey,
} from "@/lib/queries";
import { pluralWithCount } from "@/lib/format";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { ProductCardView } from "@/components/catalog/ProductCardView";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { Pagination } from "@/components/catalog/Pagination";

export const metadata: Metadata = {
  title: "Каталог металлопроката",
  description:
    "Каталог металлопроката в Санкт-Петербурге: арматура, балка, лист, труба, уголок, швеллер, круг, полоса. Актуальные цены и наличие.",
};

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; stock?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  // Режим поиска: показываем товары по всему каталогу
  if (q) {
    const result = await getCategoryProducts({
      q,
      sort: (sp.sort as SortKey) ?? "popular",
      page: Number(sp.page) || 1,
      inStockOnly: sp.stock === "1",
      pageSize: 24,
    });
    return (
      <div className="container-x py-8">
        <Breadcrumbs items={[{ label: "Каталог", href: "/catalog" }, { label: `Поиск: «${q}»` }]} />
        <h1 className="mb-6 mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
          Результаты поиска: «{q}»
        </h1>
        {result.items.length === 0 ? (
          <EmptyState q={q} />
        ) : (
          <>
            <CatalogToolbar total={result.total} />
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {result.items.map((p) => (
                <ProductCardView key={p.id} product={p} />
              ))}
            </div>
            <Pagination
              page={result.page}
              pages={result.pages}
              basePath="/catalog"
              params={{ q, sort: sp.sort, stock: sp.stock }}
            />
          </>
        )}
      </div>
    );
  }

  // Обзор категорий
  const categories = await getCategoriesWithCounts();
  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "Каталог" }]} />
      <h1 className="mb-2 mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
        Каталог металлопроката
      </h1>
      <p className="mb-8 max-w-2xl text-steel">
        Полный сортамент со склада в Санкт-Петербурге. Цены и наличие обновляются
        ежедневно. Опт и розница, резка в размер, доставка.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/catalog/${c.slug}`}
            className="group flex items-center gap-4 rounded-card border border-line bg-white p-5 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-ink/5"
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-surface text-ink transition-colors group-hover:bg-accent-soft group-hover:text-accent">
              <CategoryIcon iconKey={c.iconKey} size={34} />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-ink group-hover:text-accent">
                {c.name}
              </span>
              {c.description && (
                <span className="mt-0.5 line-clamp-1 block text-xs text-steel">
                  {c.description}
                </span>
              )}
              <span className="mt-1 block text-xs font-medium text-steel">
                {pluralWithCount(c._count.products, "позиция", "позиции", "позиций")}
              </span>
            </span>
            <ChevronRight size={18} className="ml-auto shrink-0 text-steel group-hover:text-accent" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-steel">
      <Link href="/" className="flex items-center gap-1 hover:text-accent">
        <Home size={14} /> Главная
      </Link>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={14} />
          {it.href ? (
            <Link href={it.href} className="hover:text-accent">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-12 text-center">
      <p className="text-lg font-semibold text-ink">
        По запросу «{q}» ничего не найдено
      </p>
      <p className="mt-2 text-steel">
        Попробуйте изменить запрос или{" "}
        <Link href="/catalog" className="font-semibold text-accent hover:text-accent-hover">
          вернуться в каталог
        </Link>
        .
      </p>
    </div>
  );
}
