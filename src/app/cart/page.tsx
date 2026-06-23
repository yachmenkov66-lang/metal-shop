"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatPrice, priceUnit } from "@/lib/format";
import { site } from "@/lib/site";

export default function CartPage() {
  const { items, ready, setQty, remove, totalAmount, clear } = useCart();
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    telegram: "",
    companyName: "",
    inn: "",
    comment: "",
  });
  const [showCompany, setShowCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Префилл из профиля, если залогинен
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setForm((f) => ({
            ...f,
            customerName: `${d.user.lastName} ${d.user.firstName}`.trim(),
            phone: d.user.phone ?? "",
            email: d.user.email ?? "",
            telegram: d.user.telegram ?? "",
            companyName: d.user.companyName ?? "",
            inn: d.user.inn ?? "",
          }));
          if (d.user.companyName) setShowCompany(true);
        }
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.customerName.trim() || form.phone.trim().length < 10) {
      setError("Укажите контактное лицо и телефон");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить заявку");
        return;
      }
      setSuccess(data.orderNumber);
      clear();
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  // Экран успеха
  if (success) {
    return (
      <div className="container-x py-16">
        <div className="mx-auto max-w-lg rounded-card border border-line bg-white p-8 text-center">
          <CheckCircle2 size={56} className="mx-auto text-emerald-500" />
          <h1 className="mt-4 text-2xl font-extrabold text-ink">Заявка принята!</h1>
          <p className="mt-2 text-steel">
            Номер заявки <span className="font-bold text-ink">№ {success}</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-steel">
            Менеджер свяжется с вами в рабочее время ({site.hours}), уточнит наличие
            и подготовит счёт. Спасибо за обращение!
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/catalog">
              <Button variant="primary">Вернуться в каталог</Button>
            </Link>
            <Link href="/account/orders">
              <Button variant="secondary">Мои заявки</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <div className="container-x py-16 text-center text-steel">Загрузка корзины…</div>;
  }

  // Пустая корзина
  if (items.length === 0) {
    return (
      <div className="container-x py-16">
        <div className="mx-auto max-w-md rounded-card border border-dashed border-line bg-surface p-12 text-center">
          <ShoppingCart size={48} className="mx-auto text-steel/40" />
          <h1 className="mt-4 text-xl font-bold text-ink">Корзина пуста</h1>
          <p className="mt-2 text-steel">
            Добавьте позиции из каталога — соберём заявку и выставим счёт.
          </p>
          <Link href="/catalog" className="mt-6 inline-block">
            <Button variant="primary">Перейти в каталог</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-ink sm:text-3xl">Корзина</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Позиции */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${item.slug}`}
                  className="font-semibold text-ink hover:text-accent"
                >
                  {item.name}
                </Link>
                <div className="mt-0.5 text-xs text-steel">
                  {item.steelGrade && `${item.steelGrade} · `}
                  {formatPrice(item.price)} {priceUnit(item.unit)}
                </div>
              </div>

              {/* Кол-во */}
              <div className="inline-flex items-center rounded-lg border border-line">
                <button
                  onClick={() =>
                    setQty(item.productId, Math.max(0.001, Math.round((item.quantity - 1) * 1000) / 1000))
                  }
                  className="flex h-10 w-10 items-center justify-center text-steel hover:text-ink"
                  aria-label="Меньше"
                >
                  <Minus size={15} />
                </button>
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  value={item.quantity}
                  onChange={(e) =>
                    setQty(item.productId, Math.max(0.001, Number(e.target.value) || 0.001))
                  }
                  className="h-10 w-16 border-x border-line text-center text-sm font-semibold outline-none"
                />
                <button
                  onClick={() => setQty(item.productId, Math.round((item.quantity + 1) * 1000) / 1000)}
                  className="flex h-10 w-10 items-center justify-center text-steel hover:text-ink"
                  aria-label="Больше"
                >
                  <Plus size={15} />
                </button>
                <span className="px-2 text-xs text-steel">{item.unit}</span>
              </div>

              {/* Сумма строки */}
              <div className="w-28 text-right font-bold text-ink">
                {formatPrice(item.price * item.quantity)}
              </div>

              <button
                onClick={() => remove(item.productId)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-steel hover:bg-surface hover:text-red-600"
                aria-label="Удалить"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>

        {/* Заявка */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <form
            onSubmit={submit}
            className="rounded-card border border-line bg-white p-6"
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <span className="text-steel">Итого (оценка)</span>
              <span className="text-2xl font-extrabold text-ink">{formatPrice(totalAmount)}</span>
            </div>

            <h2 className="mb-1 mt-5 text-lg font-bold text-ink">Оформление заявки</h2>
            <p className="mb-4 text-xs text-steel">
              Менеджер свяжется, уточнит наличие и выставит счёт. Онлайн-оплата не требуется.
            </p>

            <div className="space-y-3">
              <Field
                label="Контактное лицо / ФИО *"
                value={form.customerName}
                onChange={(v) => setForm({ ...form, customerName: v })}
                placeholder="Иванов Иван"
              />
              <Field
                label="Телефон *"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+7 (___) ___-__-__"
                type="tel"
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="you@example.ru"
                type="email"
              />
              <Field
                label="Telegram"
                value={form.telegram}
                onChange={(v) => setForm({ ...form, telegram: v })}
                placeholder="@username"
              />

              <button
                type="button"
                onClick={() => setShowCompany((s) => !s)}
                className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
              >
                <ChevronDown
                  size={16}
                  className={showCompany ? "rotate-180 transition-transform" : "transition-transform"}
                />
                Я представляю компанию (для счёта)
              </button>
              {showCompany && (
                <div className="space-y-3">
                  <Field
                    label="Организация"
                    value={form.companyName}
                    onChange={(v) => setForm({ ...form, companyName: v })}
                    placeholder='ООО «…»'
                  />
                  <Field
                    label="ИНН"
                    value={form.inn}
                    onChange={(v) => setForm({ ...form, inn: v })}
                    placeholder="10 или 12 цифр"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-steel">Комментарий</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={2}
                  placeholder="Резка, доставка, нужный размер…"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-ink/30"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" className="mt-4 w-full" disabled={submitting}>
              <FileText size={18} /> {submitting ? "Отправляем…" : "Отправить заявку"}
            </Button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-steel">
              Отправляя заявку, вы соглашаетесь на обработку персональных данных.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-steel">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-ink/30"
      />
    </div>
  );
}
