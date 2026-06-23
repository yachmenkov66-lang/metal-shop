import Link from "next/link";
import {
  LayoutDashboard,
  Percent,
  Package,
  ClipboardList,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminLogout } from "@/components/admin/AdminLogout";

const navItems = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { href: "/admin/markup", label: "Наценки", icon: Percent },
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/orders", label: "Заказы", icon: ClipboardList },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-[70vh] bg-surface">
      {/* Топ-бар админки */}
      <div className="border-b border-ink-deep bg-ink text-white">
        <div className="container-x flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-extrabold tracking-tight">
            <ShieldCheck size={18} className="text-accent" />
            Админ-панель
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden text-sm text-white/60 sm:inline">
              {admin.email}
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} /> На сайт
            </Link>
            <AdminLogout />
          </div>
        </div>
      </div>

      {/* Контент: боковое меню + страница */}
      <div className="container-x grid gap-6 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="flex gap-1 overflow-x-auto rounded-card border border-line bg-white p-2 lg:flex-col lg:overflow-visible">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-ink/80 transition-colors hover:bg-surface hover:text-accent"
              >
                <Icon size={17} className="shrink-0 text-steel" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
