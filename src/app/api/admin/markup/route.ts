import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recomputeFinalPrices, SETTING_DEFAULT_MARKUP } from "@/lib/pricing";

type CategoryMarkupInput = { id: number; markupPercent: number | null };

type Body = {
  global?: number;
  categories?: CategoryMarkupInput[];
};

function isValidPercent(v: unknown): v is number {
  return typeof v === "number" && isFinite(v) && v >= 0 && v <= 1000;
}

/**
 * POST /api/admin/markup
 * Тело: { global?: number, categories?: { id, markupPercent: number|null }[] }
 * Обновляет глобальную наценку и/или наценки категорий, затем пересчитывает
 * finalPrice у всех товаров (recomputeFinalPrices без аргумента).
 */
export async function POST(req: NextRequest) {
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

  // Глобальная наценка
  if (body.global !== undefined) {
    if (!isValidPercent(body.global)) {
      return NextResponse.json(
        { error: "Глобальная наценка должна быть числом от 0 до 1000" },
        { status: 400 }
      );
    }
    await prisma.setting.upsert({
      where: { key: SETTING_DEFAULT_MARKUP },
      update: { value: String(body.global) },
      create: { key: SETTING_DEFAULT_MARKUP, value: String(body.global) },
    });
  }

  // Наценки категорий
  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories)) {
      return NextResponse.json(
        { error: "Поле categories должно быть массивом" },
        { status: 400 }
      );
    }
    for (const c of body.categories) {
      if (typeof c?.id !== "number") {
        return NextResponse.json(
          { error: "У категории не задан id" },
          { status: 400 }
        );
      }
      if (c.markupPercent !== null && !isValidPercent(c.markupPercent)) {
        return NextResponse.json(
          { error: "Наценка категории должна быть числом от 0 до 1000 или пустой" },
          { status: 400 }
        );
      }
      await prisma.category.update({
        where: { id: c.id },
        data: { markupPercent: c.markupPercent },
      });
    }
  }

  // Пересчёт итоговых цен по всем товарам
  const recomputed = await recomputeFinalPrices();

  return NextResponse.json({ ok: true, recomputed });
}
