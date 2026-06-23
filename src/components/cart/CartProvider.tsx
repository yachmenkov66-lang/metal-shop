"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartLine = {
  productId: number;
  name: string;
  slug: string;
  unit: string;
  /** финальная цена за единицу на момент добавления (предпросмотр; сервер пересчитает при заказе) */
  price: number;
  size?: string | null;
  steelGrade?: string | null;
  quantity: number;
};

type CartContextType = {
  items: CartLine[];
  ready: boolean;
  count: number;
  totalAmount: number;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "metalshop_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Загрузка из localStorage после монтирования (без hydration-mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        /* ignore */
      }
    }
  }, [items, ready]);

  const add = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.productId === line.productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { ...line, quantity: qty }];
    });
  }, []);

  const setQty = useCallback((productId: number, qty: number) => {
    setItems((prev) =>
      prev.map((p) =>
        p.productId === productId ? { ...p, quantity: Math.max(0.001, qty) } : p
      )
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setItems((prev) => prev.filter((p) => p.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = items.length;
  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value: CartContextType = {
    items,
    ready,
    count,
    totalAmount,
    add,
    setQty,
    remove,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
