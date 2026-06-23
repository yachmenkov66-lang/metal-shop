import { prisma } from "@/lib/db";
import { getDefaultMarkup } from "@/lib/pricing";
import { MarkupForm } from "@/components/admin/MarkupForm";

export const metadata = { title: "Наценки" };

export default async function AdminMarkupPage() {
  const [defaultMarkup, categories] = await Promise.all([
    getDefaultMarkup(),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        markupPercent: true,
        _count: { select: { products: true } },
      },
    }),
  ]);

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    markupPercent: c.markupPercent != null ? Number(c.markupPercent) : null,
    productCount: c._count.products,
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Наценки
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-steel">
          Приоритет наценки: индивидуальная у товара → наценка категории →
          глобальная. После сохранения итоговые цены всех товаров
          пересчитываются автоматически.
        </p>
      </header>

      <MarkupForm defaultMarkup={defaultMarkup} categories={cats} />
    </div>
  );
}
