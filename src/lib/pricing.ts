/**
 * Логика наценки. Единая формула для витрины, админки и (зеркально) для Python-парсера.
 *
 * Приоритет наценки: товар > категория > глобальная настройка (по умолчанию 10%).
 */
import { prisma } from "./db";

export const DEFAULT_MARKUP_PERCENT = Number(
  process.env.DEFAULT_MARKUP_PERCENT ?? 10
);

export const SETTING_DEFAULT_MARKUP = "default_markup_percent";

/** Применить наценку к базовой цене. applyMarkup(100, 10) -> 110 */
export function applyMarkup(basePrice: number, markupPercent: number): number {
  const result = basePrice * (1 + markupPercent / 100);
  return Math.round(result * 100) / 100;
}

/** Резолв эффективной наценки по приоритету. Все аргументы — проценты или null. */
export function resolveMarkup(
  productMarkup: number | null | undefined,
  categoryMarkup: number | null | undefined,
  defaultMarkup: number
): number {
  if (productMarkup != null) return productMarkup;
  if (categoryMarkup != null) return categoryMarkup;
  return defaultMarkup;
}

/** Прочитать глобальную наценку из БД (с фолбэком на env). */
export async function getDefaultMarkup(): Promise<number> {
  const row = await prisma.setting.findUnique({
    where: { key: SETTING_DEFAULT_MARKUP },
  });
  const val = row ? Number(row.value) : NaN;
  return isFinite(val) ? val : DEFAULT_MARKUP_PERCENT;
}

/**
 * Пересчитать finalPrice для всех товаров категории (или всех, если categoryId не задан).
 * Вызывается из админки после изменения наценки.
 */
export async function recomputeFinalPrices(categoryId?: number): Promise<number> {
  const defaultMarkup = await getDefaultMarkup();
  const categories = await prisma.category.findMany({
    select: { id: true, markupPercent: true },
  });
  const catMarkup = new Map(
    categories.map((c) => [c.id, c.markupPercent ? Number(c.markupPercent) : null])
  );

  const products = await prisma.product.findMany({
    where: categoryId ? { categoryId } : undefined,
    select: { id: true, basePrice: true, markupPercent: true, categoryId: true },
  });

  let updated = 0;
  for (const p of products) {
    const markup = resolveMarkup(
      p.markupPercent ? Number(p.markupPercent) : null,
      catMarkup.get(p.categoryId) ?? null,
      defaultMarkup
    );
    const finalPrice = applyMarkup(Number(p.basePrice), markup);
    await prisma.product.update({
      where: { id: p.id },
      data: { finalPrice },
    });
    updated++;
  }
  return updated;
}
