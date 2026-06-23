"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, User, LogIn } from "lucide-react";
import { nav, site } from "@/lib/site";

export function MobileNav({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface"
        aria-label="Меню"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink-deep/40"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold text-ink">Меню</span>
              <button
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface"
                aria-label="Закрыть"
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto border-t border-line pt-4">
              <Link
                href={isAuthed ? "/account" : "/login"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-ink hover:bg-surface"
              >
                {isAuthed ? <User size={18} /> : <LogIn size={18} />}
                {isAuthed ? "Личный кабинет" : "Войти / Регистрация"}
              </Link>
              <a
                href={`tel:${site.phoneRaw}`}
                className="mt-2 block rounded-lg bg-accent px-3 py-3 text-center text-base font-bold text-white"
              >
                {site.phone}
              </a>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
