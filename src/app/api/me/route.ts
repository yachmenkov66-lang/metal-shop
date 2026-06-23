import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/** Текущий пользователь (для префилла форм). Возвращает null, если не залогинен. */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
