import type { Metadata } from "next";
import { PackageOpen, ArrowRight } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPrice, formatNumber } from "@/lib/format";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Мои заказы" };

const STATUS: Record<OrderStatus, { label: string; className: string }> = {
  NEW: { label: "Новая заявка", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  PROCESSING: {
    label: "В работе",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  INVOICED: {
    label: "Счёт выставлен",
    className: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  COMPLETED: {
    label: "Выполнен",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  CANCELLED: {
    label: "Отменён",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function OrdersPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-surface text-steel">
          <PackageOpen size={26} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-ink">Заказов пока нет</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-steel">
          Соберите корзину в каталоге и оформите заявку — счёт подготовит менеджер.
        </p>
        <div className="mt-6">
          <LinkButton href="/catalog">
            Перейти в каталог <ArrowRight size={16} />
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-ink">Мои заказы</h2>

      {orders.map((order) => {
        const status = STATUS[order.status];
        return (
          <article
            key={order.id}
            className="rounded-card border border-line bg-white p-5"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="text-sm font-bold text-ink">
                  Заказ № {order.orderNumber}
                </div>
                <div className="mt-0.5 text-xs text-steel">
                  от {dateFormatter.format(order.createdAt)}
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${status.className}`}
              >
                {status.label}
              </span>
            </header>

            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    {item.productName}
                  </span>
                  <span className="text-xs text-steel">
                    {formatNumber(Number(item.quantity))} {item.unit} ×{" "}
                    {formatPrice(Number(item.unitPrice))}
                  </span>
                  <span className="w-28 text-right text-sm font-semibold text-ink">
                    {formatPrice(Number(item.lineTotal))}
                  </span>
                </li>
              ))}
            </ul>

            <footer className="flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-steel">Итого</span>
              <span className="text-lg font-extrabold text-ink">
                {formatPrice(Number(order.totalAmount))}
              </span>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
