import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getDefaultMarkup, resolveMarkup } from "@/lib/pricing";
import { ProductRow, type ProductRowData } from "@/components/admin/ProductRow";

export const metadata = { title: "Товары" };

const PAGE_SIZE = 30;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = q
    ? { name: { contains: q, mode: "insensitive" } }
    : {};

  const [defaultMarkup, total, rows] = await Promise.all([
    getDefaultMarkup(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        unit: true,
        basePrice: true,
        finalPrice: true,
        markupPercent: true,
        inStock: true,
        isActive: true,
        category: { select: { name: true, markupPercent: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const data: ProductRowData[] = rows.map((p) => {
    const ownMarkup = p.markupPercent != null ? Number(p.markupPercent) : null;
    const catM = p.category.markupPercent != null ? Number(p.category.markupPercent) : null;
    return {
      id: p.id,
      name: p.name,
      categoryName: p.category.name,
      unit: p.unit,
      basePrice: Number(p.basePrice),
      finalPrice: Number(p.finalPrice),
      markupPercent: ownMarkup,
      effectiveMarkup: resolveMarkup(ownMarkup, catM, defaultMarkup),
      inStock: p.inStock,
      isActive: p.isActive,
    };
  });

  const mkHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Товары</h1>
          <p className="mt-1 text-sm text-steel">
            Найдено {total}. Индивидуальная наценка товара переопределяет наценку
            категории и глобальную.
          </p>
        </div>

        {/* Поиск (GET-форма) */}
        <form method="GET" className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Поиск по названию"
              className="h-10 w-64 rounded-lg border border-line pl-9 pr-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-deep"
          >
            Найти
          </button>
        </form>
      </header>

      <div className="overflow-x-auto rounded-card border border-line bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wide text-steel">
              <th className="px-4 py-3 font-semibold">Название</th>
              <th className="px-4 py-3 font-semibold">Категория</th>
              <th className="px-4 py-3 font-semibold">Ед.</th>
              <th className="px-4 py-3 text-right font-semibold">Базовая</th>
              <th className="px-4 py-3 font-semibold">Наценка, %</th>
              <th className="px-4 py-3 text-right font-semibold">Итоговая</th>
              <th className="px-4 py-3 text-center font-semibold">В наличии</th>
              <th className="px-4 py-3 text-center font-semibold">Активен</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-steel">
                  Ничего не найдено.
                </td>
              </tr>
            ) : (
              data.map((p) => <ProductRow key={p.id} product={p} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-steel">
            Страница {page} из {pages}
          </span>
          <div className="flex gap-2">
            <Link
              href={mkHref(page - 1)}
              aria-disabled={page <= 1}
              className={`inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium ${
                page <= 1
                  ? "pointer-events-none text-steel/40"
                  : "text-ink hover:bg-surface"
              }`}
            >
              <ChevronLeft size={16} /> Назад
            </Link>
            <Link
              href={mkHref(page + 1)}
              aria-disabled={page >= pages}
              className={`inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium ${
                page >= pages
                  ? "pointer-events-none text-steel/40"
                  : "text-ink hover:bg-surface"
              }`}
            >
              Вперёд <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
