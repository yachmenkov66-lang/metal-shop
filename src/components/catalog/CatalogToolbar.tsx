"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { pluralWithCount } from "@/lib/format";

const sortOptions = [
  { value: "popular", label: "Сначала популярные" },
  { value: "price_asc", label: "Сначала дешевле" },
  { value: "price_desc", label: "Сначала дороже" },
  { value: "name", label: "По названию" },
];

export function CatalogToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const sort = params.get("sort") ?? "popular";
  const stock = params.get("stock") === "1";

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete("page"); // сбрасываем пагинацию при смене фильтра
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <p className="text-sm text-steel">
        Найдено{" "}
        <span className="font-semibold text-ink">
          {pluralWithCount(total, "позиция", "позиции", "позиций")}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={stock}
            onChange={(e) => update("stock", e.target.checked ? "1" : null)}
            className="h-4 w-4 rounded border-line accent-accent"
          />
          Только в наличии
        </label>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} className="text-steel" />
          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-ink/30"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
