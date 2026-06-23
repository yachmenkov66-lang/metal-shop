import Link from "next/link";
import { ChevronLeft, ChevronRight, Phone, Mail, Send, Building2, ClipboardList } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatPrice, formatNumber } from "@/lib/format";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  type OrderStatus,
} from "@/components/admin/orderStatus";

export const metadata = { title: "Заказы" };

const PAGE_SIZE = 20;

const dtf = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [total, orders] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mkHref = (p: number) =>
    p > 1 ? `/admin/orders?page=${p}` : "/admin/orders";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Заказы</h1>
        <p className="mt-1 text-sm text-steel">Всего заявок: {total}.</p>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-card border border-line bg-white p-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-surface text-steel">
            <ClipboardList size={24} />
          </span>
          <p className="mt-4 font-semibold text-ink">Заявок пока нет</p>
          <p className="mt-1 text-sm text-steel">
            Новые заявки из корзины появятся здесь.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const status = o.status as OrderStatus;
            return (
              <article
                key={o.id}
                className="rounded-card border border-line bg-white p-5"
              >
                {/* Шапка заявки */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-ink">
                        № {o.orderNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[status]}`}
                      >
                        {ORDER_STATUS_LABEL[status]}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-steel">
                      {dtf.format(o.createdAt)}
                    </div>
                  </div>
                  <OrderStatusSelect orderId={o.id} status={status} />
                </div>

                {/* Контакты + позиции */}
                <div className="mt-4 grid gap-5 lg:grid-cols-[260px_1fr]">
                  {/* Контакты */}
                  <div className="space-y-1.5 text-sm">
                    <div className="font-semibold text-ink">{o.customerName}</div>
                    <a
                      href={`tel:${o.phone}`}
                      className="flex items-center gap-2 text-ink/80 hover:text-accent"
                    >
                      <Phone size={14} className="text-steel" /> {o.phone}
                    </a>
                    {o.email && (
                      <a
                        href={`mailto:${o.email}`}
                        className="flex items-center gap-2 text-ink/80 hover:text-accent"
                      >
                        <Mail size={14} className="text-steel" /> {o.email}
                      </a>
                    )}
                    {o.telegram && (
                      <div className="flex items-center gap-2 text-ink/80">
                        <Send size={14} className="text-steel" /> {o.telegram}
                      </div>
                    )}
                    {o.companyName && (
                      <div className="flex items-center gap-2 text-ink/80">
                        <Building2 size={14} className="text-steel" />
                        {o.companyName}
                        {o.inn ? ` · ИНН ${o.inn}` : ""}
                      </div>
                    )}
                    {o.comment && (
                      <p className="mt-2 rounded-lg bg-surface p-2 text-xs text-steel">
                        {o.comment}
                      </p>
                    )}
                  </div>

                  {/* Позиции */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-steel">
                          <th className="py-2 pr-4 font-semibold">Позиция</th>
                          <th className="py-2 pr-4 text-right font-semibold">
                            Кол-во
                          </th>
                          <th className="py-2 pr-4 text-right font-semibold">
                            Цена
                          </th>
                          <th className="py-2 text-right font-semibold">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.items.map((it) => (
                          <tr key={it.id} className="border-b border-line/60">
                            <td className="py-2 pr-4 text-ink">{it.productName}</td>
                            <td className="py-2 pr-4 text-right tabular-nums text-ink/80">
                              {formatNumber(Number(it.quantity))} {it.unit}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums text-ink/80">
                              {formatPrice(Number(it.unitPrice))}
                            </td>
                            <td className="py-2 text-right tabular-nums font-medium text-ink">
                              {formatPrice(Number(it.lineTotal))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="py-2.5 pr-4 text-right font-semibold text-ink">
                            Итого:
                          </td>
                          <td className="py-2.5 text-right text-base font-extrabold text-accent tabular-nums">
                            {formatPrice(Number(o.totalAmount))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Пагинация */}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-steel">
            Страница {page} из {pages}
          </span>
          <div className="flex gap-2">
            <Link
              href={mkHref(page - 1)}
              aria-disabled={page <= 1}
              className={`inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium ${
                page <= 1 ? "pointer-events-none text-steel/40" : "text-ink hover:bg-surface"
              }`}
            >
              <ChevronLeft size={16} /> Назад
            </Link>
            <Link
              href={mkHref(page + 1)}
              aria-disabled={page >= pages}
              className={`inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium ${
                page >= pages ? "pointer-events-none text-steel/40" : "text-ink hover:bg-surface"
              }`}
            >
              Вперёд <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
