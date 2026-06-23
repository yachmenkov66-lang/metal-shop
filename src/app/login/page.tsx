"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-steel/60 focus:border-accent";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Не удалось войти. Попробуйте ещё раз.");
        setLoading(false);
        return;
      }

      const dest =
        data?.role === "ADMIN" && from === "admin"
          ? "/admin"
          : from || "/account";

      router.push(dest);
      router.refresh();
    } catch {
      setError("Ошибка сети. Проверьте подключение и попробуйте снова.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          autoComplete="current-password"
          required
          className={inputClass}
          placeholder="Ваш пароль"
        />
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
        {loading ? "Входим…" : "Войти"}
      </Button>

      <p className="text-center text-sm text-steel">
        Нет аккаунта?{" "}
        <Link
          href={from ? `/register?from=${encodeURIComponent(from)}` : "/register"}
          className="font-semibold text-accent hover:text-accent-hover"
        >
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid-bg">
      <div className="container-x flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-line bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Вход</h1>
            <p className="mt-2 mb-6 text-sm text-steel">
              Войдите в личный кабинет, чтобы оформлять заявки и видеть свои
              заказы.
            </p>
            <Suspense
              fallback={<div className="py-8 text-center text-sm text-steel">Загрузка…</div>}
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
