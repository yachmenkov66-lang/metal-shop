"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "./orderStatus";

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  const [value, setValue] = useState<OrderStatus>(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: OrderStatus) {
    const prev = value;
    setValue(next);
    setError(false);
    setPending(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: next }),
      });
      if (!res.ok) {
        setValue(prev); // откат
        setError(true);
      }
    } catch {
      setValue(prev);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => change(e.target.value as OrderStatus)}
        className={`h-9 rounded-lg border bg-white px-3 text-sm font-medium text-ink outline-none focus:border-accent disabled:opacity-60 ${
          error ? "border-red-400" : "border-line"
        }`}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {pending && <Loader2 size={16} className="animate-spin text-steel" />}
      {error && <span className="text-xs text-red-600">ошибка</span>}
    </div>
  );
}
