"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={
        className ??
        "inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-steel transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
      }
    >
      <LogOut size={16} />
      {loading ? "Выходим…" : "Выйти"}
    </button>
  );
}
