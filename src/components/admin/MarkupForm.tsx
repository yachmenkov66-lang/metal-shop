"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";

type Category = {
  id: number;
  name: string;
  markupPercent: number | null;
  productCount: number;
};

const PREVIEW_BASE = 50000;

/** Парс поля наценки: пустая строка → null, иначе число. undefined = невалидно. */
function parseMarkup(raw: string): number | null | undefined {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!isFinite(n) || n < 0 || n > 1000) return undefined;
  return n;
}

function preview(base: number, pct: number): string {
  const result = Math.round(base * (1 + pct / 100) * 100) / 100;
  return formatPrice(result);
}

export function MarkupForm({
  defaultMarkup,
  categories,
}: {
  defaultMarkup: number;
  categories: Category[];
}) {
  const router = useRouter();

  const [globalStr, setGlobalStr] = useState(String(defaultMarkup));
  const [catStr, setCatStr] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      categories.map((c) => [c.id, c.markupPercent != null ? String(c.markupPercent) : ""])
    )
  );
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const globalVal = parseMarkup(globalStr);
  const globalEffective = typeof globalVal === "number" ? globalVal : defaultMarkup;

  const previewText = useMemo(
    () => preview(PREVIEW_BASE, globalEffective),
    [globalEffective]
  );

  async function saveAll() {
    setError(null);
    setDone(false);

    // Валидация глобальной
    const g = parseMarkup(globalStr);
    if (g === undefined || g === null) {
      setError("Глобальная наценка должна быть числом от 0 до 1000.");
      return;
    }

    // Валидация и сбор категорий
    const cats: { id: number; markupPercent: number | null }[] = [];
    for (const c of categories) {
      const v = parseMarkup(catStr[c.id] ?? "");
      if (v === undefined) {
        setError(`Наценка категории «${c.name}» некорректна (0–1000 или пусто).`);
        return;
      }
      cats.push({ id: c.id, markupPercent: v });
    }

    setPending(true);
    try {
      const res = await fetch("/api/admin/markup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: g, categories: cats }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Не удалось сохранить.");
        return;
      }
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 2500);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Глобальная наценка */}
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="text-lg font-bold text-ink">Глобальная наценка</h2>
        <p className="mt-1 text-sm text-steel">
          Базовое значение для товаров без своей наценки и без наценки категории.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Наценка, %
            </span>
            <input
              type="number"
              min={0}
              max={1000}
              step="0.01"
              value={globalStr}
              onChange={(e) => setGlobalStr(e.target.value)}
              className="h-11 w-40 rounded-lg border border-line px-3 text-sm font-semibold outline-none focus:border-accent"
            />
          </label>

          {/* Пример наглядности */}
          <div className="rounded-lg bg-surface px-4 py-3 text-sm">
            <span className="text-steel">Пример: база </span>
            <span className="font-semibold text-ink">{formatPrice(PREVIEW_BASE)}</span>
            <span className="text-steel"> → с наценкой {globalEffective}% = </span>
            <span className="font-bold text-accent">{previewText}</span>
          </div>
        </div>
      </section>

      {/* Категории */}
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="text-lg font-bold text-ink">Наценки по категориям</h2>
        <p className="mt-1 text-sm text-steel">
          Пустое поле = категория наследует глобальную наценку ({globalEffective}%).
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-steel">
                <th className="py-2 pr-4 font-semibold">Категория</th>
                <th className="py-2 pr-4 font-semibold">Товаров</th>
                <th className="py-2 pr-4 font-semibold">Наценка, %</th>
                <th className="py-2 font-semibold">
                  Пример: {formatPrice(PREVIEW_BASE)} →
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const v = parseMarkup(catStr[c.id] ?? "");
                const eff =
                  typeof v === "number" ? v : globalEffective; // пусто → глобальная
                const invalid = v === undefined;
                return (
                  <tr key={c.id} className="border-b border-line/70">
                    <td className="py-2.5 pr-4 font-medium text-ink">{c.name}</td>
                    <td className="py-2.5 pr-4 text-steel">{c.productCount}</td>
                    <td className="py-2.5 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step="0.01"
                        placeholder={`${globalEffective}`}
                        value={catStr[c.id] ?? ""}
                        onChange={(e) =>
                          setCatStr((s) => ({ ...s, [c.id]: e.target.value }))
                        }
                        className={`h-9 w-28 rounded-lg border px-3 text-sm font-semibold outline-none focus:border-accent ${
                          invalid ? "border-red-400" : "border-line"
                        }`}
                      />
                    </td>
                    <td className="py-2.5 font-semibold text-accent">
                      {invalid ? "—" : preview(PREVIEW_BASE, eff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Действия */}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={saveAll} disabled={pending} size="lg">
          {done ? <Check size={18} /> : <Save size={18} />}
          {pending ? "Сохранение…" : done ? "Сохранено" : "Сохранить и пересчитать"}
        </Button>
        {error && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle size={16} /> {error}
          </span>
        )}
        {done && !error && (
          <span className="text-sm text-steel">
            Итоговые цены товаров пересчитаны.
          </span>
        )}
      </div>
    </div>
  );
}
