"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-steel/60 focus:border-accent";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [company, setCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      lastName: String(form.get("lastName") ?? ""),
      firstName: String(form.get("firstName") ?? ""),
      phone: String(form.get("phone") ?? ""),
      telegram: String(form.get("telegram") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      companyName: company ? String(form.get("companyName") ?? "") : "",
      inn: company ? String(form.get("inn") ?? "") : "",
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Не удалось зарегистрироваться. Попробуйте ещё раз.");
        setLoading(false);
        return;
      }

      router.push(from || "/account");
      router.refresh();
    } catch {
      setError("Ошибка сети. Проверьте подключение и попробуйте снова.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Фамилия
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            className={inputClass}
            placeholder="Иванов"
          />
        </div>
        <div>
          <label htmlFor="firstName" className={labelClass}>
            Имя
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            className={inputClass}
            placeholder="Иван"
          />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Телефон
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          className={inputClass}
          placeholder="+7 (900) 000-00-00"
        />
      </div>

      <div>
        <label htmlFor="telegram" className={labelClass}>
          Telegram <span className="font-normal text-steel">— необязательно</span>
        </label>
        <input
          id="telegram"
          name="telegram"
          type="text"
          className={inputClass}
          placeholder="@username"
        />
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClass}
          placeholder="Минимум 6 символов"
        />
      </div>

      {/* Блок B2B */}
      <div className="rounded-lg border border-line bg-surface/60">
        <button
          type="button"
          onClick={() => setCompany((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-ink"
          aria-expanded={company}
        >
          <span className="inline-flex items-center gap-2">
            <Building2 size={16} className="text-steel" />
            Я представляю компанию
          </span>
          <ChevronDown
            size={18}
            className={`text-steel transition-transform ${company ? "rotate-180" : ""}`}
          />
        </button>
        {company && (
          <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
            <p className="text-xs text-steel">
              Реквизиты пригодятся для выставления счёта юрлицу или ИП.
            </p>
            <div>
              <label htmlFor="companyName" className={labelClass}>
                Название компании{" "}
                <span className="font-normal text-steel">— необязательно</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                className={inputClass}
                placeholder="ООО «СтальХаус»"
              />
            </div>
            <div>
              <label htmlFor="inn" className={labelClass}>
                ИНН <span className="font-normal text-steel">— необязательно</span>
              </label>
              <input
                id="inn"
                name="inn"
                type="text"
                inputMode="numeric"
                maxLength={12}
                className={inputClass}
                placeholder="7800000000"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? "Создаём аккаунт…" : "Создать аккаунт"}
      </Button>

      <p className="text-center text-sm text-steel">
        Уже есть аккаунт?{" "}
        <Link
          href={from ? `/login?from=${encodeURIComponent(from)}` : "/login"}
          className="font-semibold text-accent hover:text-accent-hover"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="grid-bg">
      <div className="container-x flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-line bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Регистрация
            </h1>
            <p className="mt-2 mb-6 text-sm text-steel">
              Создайте аккаунт, чтобы оформлять заявки и следить за статусом
              заказов.
            </p>
            <Suspense
              fallback={<div className="py-8 text-center text-sm text-steel">Загрузка…</div>}
            >
              <RegisterForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
