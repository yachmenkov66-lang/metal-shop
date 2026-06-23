import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCategoryBySlug,
  getCategoriesWithCounts,
  getCategoryProducts,
  type SortKey,
} from "@/lib/queries";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { ProductCardView } from "@/components/catalog/ProductCardView";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";
import { Pagination } from "@/components/catalog/Pagination";
import { Breadcrumbs } from "../page";
import { clsx } from "clsx";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return { title: "Категория не найдена" };
  return {
    title: `${cat.name} — купить в Санкт-Петербурге`,
    description: cat.description ?? `${cat.name} со склада в Санкт-Петербурге. Цены и наличие.`,
  };
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string; page?: string; stock?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;

  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const [result, allCats] = await Promise.all([
    getCategoryProducts({
      categoryId: cat.id,
      sort: (sp.sort as SortKey) ?? "popular",
      page: Number(sp.page) || 1,
      inStockOnly: sp.stock === "1",
      pageSize: 24,
    }),
    getCategoriesWithCounts(),
  ]);

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "Каталог", href: "/catalog" }, { label: cat.name }]} />

      <div className="mb-6 mt-4 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <CategoryIcon iconKey={cat.iconKey} size={36} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{cat.name}</h1>
          {cat.description && <p className="mt-1 text-steel">{cat.description}</p>}
        </div>
      </div>

      {/* Быстрое переключение разделов */}
      <div className="mb-8 flex flex-wrap gap-2">
        {allCats.map((c) => (
          <Link
            key={c.id}
            href={`/catalog/${c.slug}`}
            className={clsx(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              c.slug === cat.slug
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-steel hover:border-ink/30 hover:text-ink"
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-lg font-semibold text-ink">В этом разделе пока нет позиций</p>
          <p className="mt-2 text-steel">
            Каталог обновляется ежедневно. Уточните наличие у менеджера или загляните позже.
          </p>
        </div>
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
            basePath={`/catalog/${cat.slug}`}
            params={{ sort: sp.sort, stock: sp.stock }}
          />
        </>
      )}
    </div>
  );
}
