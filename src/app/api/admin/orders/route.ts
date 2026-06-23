import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const STATUSES = [
  "NEW",
  "PROCESSING",
  "INVOICED",
  "COMPLETED",
  "CANCELLED",
] as const;
type OrderStatus = (typeof STATUSES)[number];

type Body = { id?: number; status?: string };

/**
 * PATCH /api/admin/orders
 * Тело: { id, status }. Меняет статус заявки.
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
    return NextResponse.json({ error: "Не задан id заявки" }, { status: 400 });
  }
  if (!body.status || !STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json(
      { error: "Недопустимый статус" },
      { status: 400 }
    );
  }

  const exists = await prisma.order.findUnique({
    where: { id: body.id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  await prisma.order.update({
    where: { id: body.id },
    data: { status: body.status as OrderStatus },
  });

  return NextResponse.json({ ok: true });
}
