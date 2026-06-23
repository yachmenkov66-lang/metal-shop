"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { formatPrice, priceUnit } from "@/lib/format";

export type ProductRowData = {
  id: number;
  name: string;
  categoryName: string;
  unit: string;
  basePrice: number;
  finalPrice: number;
  markupPercent: number | null; // индивидуальная (null = наследует)
  effectiveMarkup: number; // эффективная после резолва
  inStock: boolean;
  isActive: boolean;
};

function parseMarkup(raw: string): number | null | undefined {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!isFinite(n) || n < 0 || n > 1000) return undefined;
  return n;
}

function Toggle({
  on,
  onToggle,
  disabled,
  labelOn,
  labelOff,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? labelOn : labelOff}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-accent" : "bg-line"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function ProductRow({ product }: { product: ProductRowData }) {
  const [markupStr, setMarkupStr] = useState(
    product.markupPercent != null ? String(product.markupPercent) : ""
  );
  const [finalPrice, setFinalPrice] = useState(product.finalPrice);
  const [inStock, setInStock] = useState(product.inStock);
  const [isActive, setIsActive] = useState(product.isActive);
  const [savedMarkup, setSavedMarkup] = useState(
    product.markupPercent != null ? String(product.markupPercent) : ""
  );

  const [pending, setPending] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState(false);

  const parsed = parseMarkup(markupStr);
  const markupInvalid = parsed === undefined;
  const markupChanged = markupStr.trim() !== savedMarkup.trim();

  async function patch(payload: Record<string, unknown>) {
    setError(false);
    setPending(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(true);
        return null;
      }
      if (typeof data.finalPrice === "number") setFinalPrice(data.finalPrice);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      return data;
    } catch {
      setError(true);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function saveMarkup() {
    if (markupInvalid || !markupChanged) return;
    const ok = await patch({ markupPercent: parsed });
    if (ok) setSavedMarkup(markupStr.trim());
  }

  async function toggleInStock() {
    const next = !inStock;
    setInStock(next);
    const ok = await patch({ inStock: next });
    if (!ok) setInStock(!next); // откат при ошибке
  }

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    const ok = await patch({ isActive: next });
    if (!ok) setIsActive(!next);
  }

  return (
    <tr className="border-b border-line/70 last:border-0">
      <td className="px-4 py-3 font-medium text-ink">{product.name}</td>
      <td className="px-4 py-3 text-steel">{product.categoryName}</td>
      <td className="px-4 py-3 text-steel">{product.unit}</td>
      <td className="px-4 py-3 text-right tabular-nums text-ink">
        {formatPrice(product.basePrice)}
        <span className="ml-1 text-xs text-steel">{priceUnit(product.unit)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={1000}
            step="0.01"
            value={markupStr}
            placeholder={`${product.effectiveMarkup}`}
            onChange={(e) => setMarkupStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveMarkup();
            }}
            className={`h-9 w-20 rounded-lg border px-2 text-sm font-semibold outline-none focus:border-accent ${
              markupInvalid ? "border-red-400" : "border-line"
            }`}
          />
          <button
            type="button"
            onClick={saveMarkup}
            disabled={!markupChanged || markupInvalid || pending}
            className="inline-flex h-9 items-center rounded-lg bg-ink px-2.5 text-xs font-semibold text-white transition-colors hover:bg-ink-deep disabled:opacity-40"
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : justSaved ? (
              <Check size={14} />
            ) : (
              "OK"
            )}
          </button>
        </div>
        {markupStr.trim() === "" && (
          <span className="mt-1 block text-[11px] text-steel">
            наследует {product.effectiveMarkup}%
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`tabular-nums font-bold ${error ? "text-red-600" : "text-accent"}`}
        >
          {formatPrice(finalPrice)}
        </span>
        <span className="ml-1 text-xs text-steel">{priceUnit(product.unit)}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <Toggle
          on={inStock}
          onToggle={toggleInStock}
          disabled={pending}
          labelOn="В наличии"
          labelOff="Нет в наличии"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <Toggle
          on={isActive}
          onToggle={toggleActive}
          disabled={pending}
          labelOn="Активен"
          labelOff="Скрыт"
        />
      </td>
    </tr>
  );
}
