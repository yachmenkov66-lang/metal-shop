import Link from "next/link";
import { User, ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/account/LogoutButton";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const navItems = [
    { href: "/account", label: "Профиль", icon: User },
    { href: "/account/orders", label: "Мои заказы", icon: ClipboardList },
  ];

  return (
    <div className="bg-surface">
      <div className="container-x py-8 sm:py-12">
        <div className="mb-6">
          <p className="text-sm text-steel">Личный кабинет</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Здравствуйте, {user.firstName}!
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="rounded-card border border-line bg-white p-2">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
                >
                  <Icon size={16} className="text-steel" />
                  {label}
                </Link>
              ))}
              <div className="my-1 border-t border-line" />
              <LogoutButton />
            </nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
