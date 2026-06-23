"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartButton({ compact = false }: { compact?: boolean }) {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-surface transition-colors"
      aria-label="Корзина"
    >
      <span className="relative">
        <ShoppingCart size={20} />
        {ready && count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </span>
      {!compact && <span className="hidden sm:inline">Корзина</span>}
    </Link>
  );
}
