import Link from "next/link";
import { Phone, User, Search, Clock, MapPin } from "lucide-react";
import { nav, site } from "@/lib/site";
import { CartButton } from "../cart/CartButton";
import { MobileNav } from "./MobileNav";
import type { CurrentUser } from "@/lib/auth";

export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={site.name}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-md bg-ink">
        <span className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/80" />
        <span className="relative font-mono text-sm font-bold text-white">С</span>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-ink">
        Сталь<span className="text-accent">Хауз</span>
      </span>
    </Link>
  );
}

export function Header({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* Тонкая полоса доверия */}
      <div className="hidden bg-ink text-white/70 md:block">
        <div className="container-x flex h-9 items-center justify-between text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} /> {site.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={13} /> {site.hours}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href={`mailto:${site.email}`} className="hover:text-white">
              {site.email}
            </a>
            <a href={`tel:${site.phoneRaw}`} className="font-semibold text-white hover:text-accent">
              {site.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Основная строка */}
      <div className="border-b border-line">
        <div className="container-x flex h-16 items-center gap-4">
          <Logo />

          {/* Поиск (форма GET — работает и без JS) */}
          <form action="/catalog" className="hidden flex-1 md:flex">
            <div className="flex w-full max-w-xl items-center rounded-lg border border-line focus-within:border-ink/30">
              <input
                type="search"
                name="q"
                placeholder="Поиск: арматура, балка, лист, труба…"
                className="h-11 flex-1 rounded-l-lg bg-transparent px-4 text-sm outline-none"
              />
              <button
                type="submit"
                className="flex h-11 w-12 items-center justify-center rounded-r-lg text-steel hover:text-ink"
                aria-label="Найти"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <a
              href={`tel:${site.phoneRaw}`}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-surface lg:flex"
            >
              <Phone size={18} className="text-accent" />
              {site.phone}
            </a>
            <Link
              href={user ? "/account" : "/login"}
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-surface sm:flex"
            >
              <User size={18} />
              {user ? user.firstName || "Кабинет" : "Войти"}
            </Link>
            <CartButton />
            <MobileNav isAuthed={!!user} />
          </div>
        </div>
      </div>

      {/* Навигация по разделам */}
      <div className="hidden border-b border-line lg:block">
        <div className="container-x flex h-11 items-center gap-6 text-sm">
          <Link
            href="/catalog"
            className="font-semibold text-accent hover:text-accent-hover"
          >
            Весь каталог
          </Link>
          {nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-steel hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
