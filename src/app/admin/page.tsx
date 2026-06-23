import Link from "next/link";
import {
  Package,
  PackageCheck,
  Layers,
  ClipboardList,
  Percent,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getDefaultMarkup } from "@/lib/pricing";
import { formatNumber } from "@/lib/format";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  type OrderStatus,
} from "@/components/admin/orderStatus";

export const metadata = { title: "Дашборд" };

export default async function AdminDashboardPage() {
  const [
    totalProducts,
    activeProducts,
    categories,
    ordersByStatus,
    defaultMarkup,
    lastScrape,
    totalOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    getDefaultMarkup(),
    prisma.scrapeRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.order.count(),
  ]);

  const ordersCount = new Map<OrderStatus, number>(
    ordersByStatus.map((r) => [r.status as OrderStatus, r._count._all])
  );

  const metrics = [
    {
      label: "Всего товаров",
      value: formatNumber(totalProducts),
      icon: Package,
    },
    {
      label: "Активных товаров",
      value: formatNumber(activeProducts),
      icon: PackageCheck,
    },
    { label: "Категорий", value: formatNumber(categories), icon: Layers },
    {
      label: "Всего заявок",
      value: formatNumber(totalOrders),
      icon: ClipboardList,
    },
  ];

  const scrapeStatusRu: Record<string, string> = {
    RUNNING: "выполняется",
    SUCCESS: "успешно",
    FAILED: "ошибка",
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          Дашборд
        </h1>
        <p className="mt-1 text-sm text-steel">
          Общая сводка по каталогу, наценке и заявкам.
        </p>
      </header>

      {/* Метрики */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-card border border-line bg-white p-5"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon size={20} />
            </span>
            <div className="mt-3 text-3xl font-extrabold text-ink">{value}</div>
            <div className="mt-1 text-sm text-steel">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Глобальная наценка */}
        <div className="rounded-card border border-line bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Percent size={16} className="text-accent" /> Глобальная наценка
          </div>
          <div className="mt-3 text-3xl font-extrabold text-accent">
            {formatNumber(defaultMarkup)} %
          </div>
          <p className="mt-1 text-xs text-steel">
            Применяется к товарам без индивидуальной наценки и без наценки
            категории.
          </p>
          <Link
            href="/admin/markup"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Управление наценками <ArrowRight size={15} />
          </Link>
        </div>

        {/* Заявки по статусам */}
        <div className="rounded-card border border-line bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardList size={16} className="text-accent" /> Заявки по
            статусам
          </div>
          <ul className="mt-3 space-y-2">
            {ORDER_STATUSES.map((s) => (
              <li
                key={s}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[s]}`}
                >
                  {ORDER_STATUS_LABEL[s]}
                </span>
                <span className="font-bold text-ink">
                  {formatNumber(ordersCount.get(s) ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/orders"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Все заявки <ArrowRight size={15} />
          </Link>
        </div>

        {/* Последний парсинг */}
        <div className="rounded-card border border-line bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <RefreshCw size={16} className="text-accent" /> Последний парсинг
          </div>
          {lastScrape ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-steel">Статус</dt>
                <dd className="font-semibold text-ink">
                  {scrapeStatusRu[lastScrape.status] ?? lastScrape.status}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-steel">Дата</dt>
                <dd className="font-medium text-ink">
                  {new Intl.DateTimeFormat("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(lastScrape.startedAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-steel">Обновлено товаров</dt>
                <dd className="font-semibold text-ink">
                  {formatNumber(lastScrape.productsUpserted)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-steel">
              Парсинг ещё не запускался.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
