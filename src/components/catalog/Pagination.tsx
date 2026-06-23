import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

/** Серверная пагинация ссылками. Сохраняет текущие query-параметры. */
export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && k !== "page") sp.set(k, v);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // окно страниц
  const nums: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(pages, page + 2);
  for (let i = from; i <= to; i++) nums.push(i);

  const cell =
    "flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-medium";

  return (
    <nav className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={href(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={clsx(
          cell,
          page === 1
            ? "pointer-events-none border-line text-steel/40"
            : "border-line text-ink hover:border-ink/30"
        )}
      >
        <ChevronLeft size={16} />
      </Link>

      {from > 1 && (
        <>
          <Link href={href(1)} className={clsx(cell, "border-line text-ink hover:border-ink/30")}>
            1
          </Link>
          {from > 2 && <span className="px-1 text-steel">…</span>}
        </>
      )}

      {nums.map((n) => (
        <Link
          key={n}
          href={href(n)}
          className={clsx(
            cell,
            n === page
              ? "border-accent bg-accent text-white"
              : "border-line text-ink hover:border-ink/30"
          )}
        >
          {n}
        </Link>
      ))}

      {to < pages && (
        <>
          {to < pages - 1 && <span className="px-1 text-steel">…</span>}
          <Link href={href(pages)} className={clsx(cell, "border-line text-ink hover:border-ink/30")}>
            {pages}
          </Link>
        </>
      )}

      <Link
        href={href(Math.min(pages, page + 1))}
        aria-disabled={page === pages}
        className={clsx(
          cell,
          page === pages
            ? "pointer-events-none border-line text-steel/40"
            : "border-line text-ink hover:border-ink/30"
        )}
      >
        <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
