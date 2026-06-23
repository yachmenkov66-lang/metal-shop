import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { orderSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Проверьте данные формы";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const data = parsed.data;

  // Цены берём ТОЛЬКО из БД (не доверяем клиенту)
  const ids = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = data.items
    .map((i) => {
      const p = byId.get(i.productId);
      if (!p) return null;
      const unitPrice = Number(p.finalPrice);
      const quantity = i.quantity;
      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
      return {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        quantity,
        unitPrice,
        lineTotal,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lines.length === 0) {
    return NextResponse.json(
      { error: "Товары из корзины не найдены или сняты с продажи" },
      { status: 400 }
    );
  }

  const totalAmount =
    Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;

  const user = await getCurrentUser();
  const year = new Date().getFullYear();

  // Создаём заказ, затем присваиваем человекочитаемый номер на основе id
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: `tmp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        userId: user?.id ?? null,
        status: "NEW",
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || null,
        telegram: data.telegram || null,
        companyName: data.companyName || null,
        inn: data.inn || null,
        comment: data.comment || null,
        totalAmount,
        items: { create: lines },
      },
    });
    return tx.order.update({
      where: { id: created.id },
      data: { orderNumber: `${year}-${String(created.id).padStart(6, "0")}` },
    });
  });

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}
