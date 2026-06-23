import Link from "next/link";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { site } from "@/lib/site";
import { Logo } from "./Header";

const footerCategories = [
  { slug: "armatura", name: "Арматура" },
  { slug: "balka", name: "Балка" },
  { slug: "list", name: "Лист" },
  { slug: "truba", name: "Труба" },
  { slug: "ugolok", name: "Уголок" },
  { slug: "shveller", name: "Швеллер" },
];

export function Footer() {
  return (
    <footer id="contacts" className="mt-20 bg-ink-deep text-white/70">
      <div className="container-x grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="[&_*]:!text-white">
            <Logo />
          </div>
          <p className="mt-4 text-sm leading-relaxed">{site.description}</p>
          <p className="mt-4 text-sm">
            На рынке металлопроката более {site.yearsOnMarket} лет.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
            Каталог
          </h4>
          <ul className="space-y-2.5 text-sm">
            {footerCategories.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalog/${c.slug}`} className="hover:text-accent">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/catalog" className="font-semibold text-accent hover:text-accent-hover">
                Весь каталог →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
            Компания
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/#about" className="hover:text-accent">О компании</Link></li>
            <li><Link href="/#delivery" className="hover:text-accent">Доставка и оплата</Link></li>
            <li><Link href="/#reviews" className="hover:text-accent">Отзывы</Link></li>
            <li><Link href="/register" className="hover:text-accent">Регистрация</Link></li>
            <li><Link href="/account" className="hover:text-accent">Личный кабинет</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
            Контакты
          </h4>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={`tel:${site.phoneRaw}`} className="flex items-center gap-2 text-base font-bold text-white hover:text-accent">
                <Phone size={16} className="text-accent" /> {site.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex items-center gap-2 hover:text-accent">
                <Mail size={16} /> {site.email}
              </a>
            </li>
            <li>
              <a href={`https://t.me/${site.telegram}`} className="flex items-center gap-2 hover:text-accent" target="_blank" rel="noopener">
                <Send size={16} /> @{site.telegram}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" /> {site.address}
            </li>
            <li className="flex items-center gap-2">
              <Clock size={16} /> {site.hours}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.legalName}. ИНН {site.inn}, ОГРН {site.ogrn}
          </p>
          <p>Цены и наличие — справочные, не оферта. Уточняйте у менеджера.</p>
        </div>
      </div>
    </footer>
  );
}
