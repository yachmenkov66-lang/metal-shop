import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, setSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

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
    data = loginSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      const message = err.issues[0]?.message ?? "Проверьте правильность полей";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, passwordHash: true, role: true },
  });

  const ok = user
    ? await verifyPassword(data.password, user.passwordHash)
    : false;

  if (!user || !ok) {
    return NextResponse.json(
      { error: "Неверная почта или пароль" },
      { status: 401 }
    );
  }

  await setSession({ userId: user.id, role: user.role });

  return NextResponse.json({ ok: true, role: user.role });
}
