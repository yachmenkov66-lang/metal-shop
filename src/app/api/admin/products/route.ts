import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  applyMarkup,
  resolveMarkup,
  getDefaultMarkup,
} from "@/lib/pricing";

type Body = {
  id?: number;
  markupPercent?: number | null;
  inStock?: boolean;
  isActive?: boolean;
};

function isValidPercent(v: unknown): v is number {
  return typeof v === "number" && isFinite(v) && v >= 0 && v <= 1000;
}

/**
 * PATCH /api/admin/products
 * Тело: { id, markupPercent?: number|null, inStock?: boolean, isActive?: boolean }
 * Обновляет товар и пересчитывает его finalPrice по эффективной наценке
 * (товар > категория > глобальная).
 */
export async function PATCH(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u || u.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  if (typeof body.id !== "number") {
    return NextResponse.json({ error: "Не задан id товара" }, { status: 400 });
  }
  if (
    body.markupPercent !== undefined &&
    body.markupPercent !== null &&
    !isValidPercent(body.markupPercent)
  ) {
    return NextResponse.json(
      { error: "Наценка должна быть числом от 0 до 1000 или пустой" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: body.id },
    select: {
      id: true,
      basePrice: true,
      markupPercent: true,
      categoryId: true,
      category: { select: { markupPercent: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  // Эффективная наценка: если в теле передана markupPercent — берём её,
  // иначе оставляем текущую наценку товара.
  const nextProductMarkup =
    body.markupPercent !== undefined
      ? body.markupPercent
      : product.markupPercent
        ? Number(product.markupPercent)
        : null;

  const defaultMarkup = await getDefaultMarkup();
  const effective = resolveMarkup(
    nextProductMarkup,
    product.category.markupPercent ? Number(product.category.markupPercent) : null,
    defaultMarkup
  );
  const finalPrice = applyMarkup(Number(product.basePrice), effective);

  const data: {
    markupPercent?: number | null;
    inStock?: boolean;
    isActive?: boolean;
    finalPrice: number;
  } = { finalPrice };
  if (body.markupPercent !== undefined) data.markupPercent = body.markupPercent;
  if (typeof body.inStock === "boolean") data.inStock = body.inStock;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  await prisma.product.update({ where: { id: product.id }, data });

  return NextResponse.json({ ok: true, finalPrice });
}
