"use client";

import { useState } from "react";
import { Check, ShoppingCart, Minus, Plus } from "lucide-react";
import { useCart, type CartLine } from "./CartProvider";
import { Button } from "../ui/Button";
import { clsx } from "clsx";

export function AddToCart({
  product,
  withQuantity = false,
  size = "md",
  full = false,
}: {
  product: Omit<CartLine, "quantity">;
  withQuantity?: boolean;
  size?: "sm" | "md" | "lg";
  full?: boolean;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (!withQuantity) {
    return (
      <Button
        variant={added ? "secondary" : "primary"}
        size={size}
        onClick={handleAdd}
        className={clsx(full && "w-full")}
      >
        {added ? <Check size={16} /> : <ShoppingCart size={16} />}
        {added ? "В корзине" : "В корзину"}
      </Button>
    );
  }

  return (
    <div className={clsx("flex items-center gap-3", full && "flex-col sm:flex-row")}>
      <div className="inline-flex items-center rounded-lg border border-line">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, Math.round((q - 1) * 1000) / 1000))}
          className="flex h-11 w-11 items-center justify-center text-steel hover:text-ink"
          aria-label="Меньше"
        >
          <Minus size={16} />
        </button>
        <input
          type="number"
          min={0.001}
          step="any"
          value={qty}
          onChange={(e) => setQty(Math.max(0.001, Number(e.target.value) || 1))}
          className="h-11 w-16 border-x border-line text-center text-sm font-semibold outline-none"
        />
        <button
          type="button"
          onClick={() => setQty((q) => Math.round((q + 1) * 1000) / 1000)}
          className="flex h-11 w-11 items-center justify-center text-steel hover:text-ink"
          aria-label="Больше"
        >
          <Plus size={16} />
        </button>
      </div>
      <Button
        variant={added ? "secondary" : "primary"}
        size={size}
        onClick={handleAdd}
        className={clsx(full && "flex-1")}
      >
        {added ? <Check size={18} /> : <ShoppingCart size={18} />}
        {added ? "Добавлено" : "В корзину"}
      </Button>
    </div>
  );
}
