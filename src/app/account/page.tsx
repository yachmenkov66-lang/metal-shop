import type { Metadata } from "next";
import { ArrowRight, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LinkButton } from "@/components/ui/Button";
import { pluralWithCount } from "@/lib/format";

export const metadata: Metadata = { title: "Профиль" };

export default async function AccountPage() {
  const user = await requireUser();

  const ordersCount = await prisma.order.count({
    where: { userId: user.id },
  });

  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "ФИО", value: `${user.lastName} ${user.firstName}`.trim() },
    { label: "Email", value: user.email },
    { label: "Телефон", value: user.phone },
    { label: "Telegram", value: user.telegram },
    { label: "Компания", value: user.companyName },
    { label: "ИНН", value: user.inn },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="text-lg font-bold text-ink">Профиль</h2>
        <dl className="mt-4 divide-y divide-line">
          {rows
            .filter((r) => r.value)
            .map((r) => (
              <div
                key={r.label}
                className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <dt className="w-40 shrink-0 text-sm text-steel">{r.label}</dt>
                <dd className="text-sm font-medium text-ink">{r.value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <section className="rounded-card border border-line bg-white p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <ClipboardList size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">Заказы</h2>
            <p className="mt-1 text-sm text-steel">
              {ordersCount > 0
                ? `У вас ${pluralWithCount(ordersCount, "заказ", "заказа", "заказов")}.`
                : "Вы ещё не оформляли заказов."}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton href="/catalog" variant="primary">
            Перейти в каталог <ArrowRight size={16} />
          </LinkButton>
          <LinkButton href="/account/orders" variant="secondary">
            Мои заказы
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
