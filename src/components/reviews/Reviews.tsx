import { Stars } from "../ui/Stars";
import { formatNumber, pluralWithCount } from "@/lib/format";
import { Quote } from "lucide-react";

type Review = {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  source: string | null;
};

export function Reviews({
  reviews,
  stats,
}: {
  reviews: Review[];
  stats: { avg: number; count: number };
}) {
  if (reviews.length === 0) return null;

  return (
    <section id="reviews" className="bg-surface py-16 sm:py-20">
      <div className="container-x">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
              Отзывы клиентов
            </h2>
            <p className="mt-2 max-w-xl text-steel">
              Нам доверяют строительные компании, производства и частные
              заказчики Санкт-Петербурга и области.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-card border border-line bg-white px-5 py-3">
            <span className="text-3xl font-extrabold text-ink">
              {formatNumber(Math.round(stats.avg * 10) / 10)}
            </span>
            <div>
              <Stars rating={stats.avg} size={16} />
              <div className="text-xs text-steel">
                {pluralWithCount(stats.count, "отзыв", "отзыва", "отзывов")}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="flex flex-col rounded-card border border-line bg-white p-6"
            >
              <div className="mb-3 flex items-center justify-between">
                <Stars rating={r.rating} size={15} />
                <Quote size={20} className="text-line" />
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-ink/85">
                {r.text}
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm font-semibold text-ink">
                  {r.authorName}
                </span>
                {r.source && (
                  <span className="text-xs text-steel">{r.source}</span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
