import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный запрос" },
      { status: 400 }
    );
  }

  let data;
  try {
    data = registerSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues[0]?.message ?? "Проверьте правильность полей";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw err;
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с такой почтой уже существует" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      lastName: data.lastName,
      firstName: data.firstName,
      phone: data.phone,
      telegram: data.telegram ? data.telegram : null,
      role: "CUSTOMER",
      companyName: data.companyName ? data.companyName : null,
      inn: data.inn ? data.inn : null,
    },
    select: { id: true },
  });

  await setSession({ userId: user.id, role: "CUSTOMER" });

  return NextResponse.json({ ok: true });
}
