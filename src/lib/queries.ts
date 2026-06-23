import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

/** DTO товара для витрины (Decimal → number, безопасно для клиентских компонентов). */
export type ProductCard = {
  id: number;
  slug: string;
  name: string;
  size: string | null;
  steelGrade: string | null;
  gost: string | null;
  unit: string;
  basePrice: number;
  finalPrice: number;
  inStock: boolean;
  stockText: string | null;
  categorySlug: string;
  categoryName: string;
};

type ProductWithCat = Prisma.ProductGetPayload<{
  include: { category: { select: { slug: true; name: true } } };
}>;

export function toCard(p: ProductWithCat): ProductCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    size: p.size,
    steelGrade: p.steelGrade,
    gost: p.gost,
    unit: p.unit,
    basePrice: Number(p.basePrice),
    finalPrice: Number(p.finalPrice),
    inStock: p.inStock,
    stockText: p.stockText,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
  };
}

export async function getCategoriesWithCounts() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

export type SortKey = "popular" | "price_asc" | "price_desc" | "name";

function orderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ finalPrice: "asc" }];
    case "price_desc":
      return [{ finalPrice: "desc" }];
    case "name":
      return [{ name: "asc" }];
    default:
      return [{ inStock: "desc" }, { name: "asc" }];
  }
}

export async function getCategoryProducts(opts: {
  categoryId?: number;
  q?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  inStockOnly?: boolean;
}): Promise<{ items: ProductCard[]; total: number; pages: number; page: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 24;
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.inStockOnly ? { inStock: true } : {}),
    ...(opts.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: "insensitive" } },
            { steelGrade: { contains: opts.q, mode: "insensitive" } },
            { size: { contains: opts.q, mode: "insensitive" } },
            { gost: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: orderBy(opts.sort ?? "popular"),
      include: { category: { select: { slug: true, name: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(toCard),
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    page,
  };
}

export async function getProductBySlug(slug: string) {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: { category: { select: { slug: true, name: true } } },
  });
  return p ? { ...toCard(p), priceWithVat: p.priceWithVat, sourceUrl: p.sourceUrl } : null;
}

export async function getRelatedProducts(categoryId: number, excludeId: number, take = 4) {
  const rows = await prisma.product.findMany({
    where: { categoryId, isActive: true, id: { not: excludeId } },
    include: { category: { select: { slug: true, name: true } } },
    take,
    orderBy: { name: "asc" },
  });
  return rows.map(toCard);
}

export async function getReviews() {
  return prisma.review.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getReviewStats() {
  const agg = await prisma.review.aggregate({
    where: { isPublished: true },
    _avg: { rating: true },
    _count: true,
  });
  return {
    avg: agg._avg.rating ?? 5,
    count: agg._count,
  };
}
