"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

/** Кнопка выхода из админ-панели. Чистит сессию и уводит на главную. */
export function AdminLogout({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={
        className ??
        "inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white disabled:opacity-50"
      }
    >
      <LogOut size={16} />
      {pending ? "Выход…" : "Выход"}
    </button>
  );
}
