import Link from "next/link";
import {
  ArrowRight,
  Truck,
  Scissors,
  Wallet,
  FileText,
  ShieldCheck,
  Building2,
  Percent,
  Phone,
  MapPin,
  BadgeCheck,
  PackageCheck,
} from "lucide-react";
import { site } from "@/lib/site";
import {
  getCategoriesWithCounts,
  getReviews,
  getReviewStats,
  getCategoryProducts,
} from "@/lib/queries";
import { LinkButton } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/catalog/CategoryIcon";
import { ProductCardView } from "@/components/catalog/ProductCardView";
import { Reviews } from "@/components/reviews/Reviews";
import { pluralWithCount } from "@/lib/format";

export const dynamic = "force-dynamic"; // всегда свежие цены/наличие из БД

export default async function HomePage() {
  const [categories, reviews, stats, popular] = await Promise.all([
    getCategoriesWithCounts(),
    getReviews(),
    getReviewStats(),
    getCategoryProducts({ sort: "popular", pageSize: 8 }),
  ]);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="container-x relative grid gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
              <MapPin size={13} /> {site.city} · более {site.yearsOnMarket} лет на рынке
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Металлопрокат со склада <span className="text-accent">в Санкт-Петербурге</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/70">
              Арматура, балка, лист, труба, уголок, швеллер. Опт и розница, резка в
              размер, доставка по городу и области. Актуальные цены и наличие
              обновляются ежедневно.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/catalog" size="lg">
                Перейти в каталог <ArrowRight size={18} />
              </LinkButton>
              <a
                href={`tel:${site.phoneRaw}`}
                className="inline-flex h-13 items-center gap-2 rounded-lg border border-white/20 px-7 text-base font-semibold text-white hover:bg-white/10"
              >
                <Phone size={18} /> {site.phone}
              </a>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              {[
                { icon: PackageCheck, t: "Всё в наличии" },
                { icon: Scissors, t: "Резка в размер" },
                { icon: Truck, t: "Доставка" },
                { icon: FileText, t: "Работаем с НДС" },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-2 text-white/80">
                  <Icon size={18} className="text-accent" /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ КАТЕГОРИИ ============ */}
      <section className="container-x py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Каталог металлопроката</h2>
            <p className="mt-2 text-steel">Выберите раздел — цены актуальны на сегодня</p>
          </div>
          <Link href="/catalog" className="hidden items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover sm:flex">
            Все разделы <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/catalog/${c.slug}`}
              className="group flex flex-col items-start rounded-card border border-line bg-white p-5 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-ink/5"
            >
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-xl bg-surface text-ink transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                <CategoryIcon iconKey={c.iconKey} size={30} />
              </span>
              <span className="font-bold text-ink group-hover:text-accent">{c.name}</span>
              <span className="mt-1 text-xs text-steel">
                {pluralWithCount(c._count.products, "позиция", "позиции", "позиций")}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ ПОПУЛЯРНЫЕ ПОЗИЦИИ ============ */}
      {popular.items.length > 0 && (
        <section className="container-x pb-16 sm:pb-20">
          <h2 className="mb-8 text-2xl font-extrabold text-ink sm:text-3xl">Популярные позиции</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {popular.items.map((p) => (
              <ProductCardView key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ============ ПРЕИМУЩЕСТВА ============ */}
      <section id="about" className="bg-surface py-16 sm:py-20">
        <div className="container-x">
          <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Почему выбирают нас</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: PackageCheck, t: "Реальное наличие", d: "Склад в черте города. Цены и остатки на сайте обновляются ежедневно из первоисточника." },
              { icon: Percent, t: "Честная цена", d: "Прозрачная наценка без скрытых накруток в счёте. Опт — дешевле, спрашивайте спеццену под объём." },
              { icon: Scissors, t: "Резка и обработка", d: "Порежем лист и сорт в размер, подготовим к самовывозу. Экономим ваше время на объекте." },
              { icon: Truck, t: "Доставка по СПб и ЛО", d: "Манипулятор, бортовые машины, длинномеры. Привозим точно в согласованное окно." },
              { icon: Building2, t: "Удобно юрлицам", d: "Работаем с НДС, полный пакет документов, отсрочка платежа для постоянных клиентов." },
              { icon: ShieldCheck, t: "Только сертификат", d: "Металл с сертификатами качества и соответствием ГОСТ. Никакого неликвида." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-card border border-line bg-white p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={24} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ДОСТАВКА И ОПЛАТА ============ */}
      <section id="delivery" className="container-x py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-card border border-line bg-white p-8">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-white">
              <Truck size={24} />
            </span>
            <h3 className="mt-4 text-xl font-bold text-ink">Доставка</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink/80">
              {[
                "Самовывоз со склада в Санкт-Петербурге — бесплатно",
                "Доставка манипулятором (КМУ) по городу и Ленобласти",
                "Бортовые машины и длинномеры под объём и длину",
                "Расчёт стоимости доставки — индивидуально по адресу",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <BadgeCheck size={18} className="mt-0.5 shrink-0 text-accent" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-line bg-white p-8">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-white">
              <Wallet size={24} />
            </span>
            <h3 className="mt-4 text-xl font-bold text-ink">Оплата</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink/80">
              {[
                "Наличный и безналичный расчёт, оплата по счёту",
                "Для юрлиц и ИП — работаем с НДС, полный пакет документов",
                "Отсрочка платежа для постоянных клиентов",
                "Физлицам — наличные, карта, перевод по реквизитам",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <BadgeCheck size={18} className="mt-0.5 shrink-0 text-accent" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* О компании / цифры */}
        <div className="mt-8 grid grid-cols-2 gap-4 rounded-card bg-ink p-8 text-white sm:grid-cols-4">
          {[
            { n: `${site.yearsOnMarket}+`, t: "лет на рынке СПб" },
            { n: "1000+", t: "позиций на складе" },
            { n: "24 ч", t: "обновление цен" },
            { n: "B2B / B2C", t: "опт и розница" },
          ].map((s) => (
            <div key={s.t}>
              <div className="text-3xl font-extrabold text-accent">{s.n}</div>
              <div className="mt-1 text-sm text-white/70">{s.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ ОТЗЫВЫ ============ */}
      <Reviews reviews={reviews} stats={stats} />

      {/* ============ ФИНАЛЬНЫЙ CTA ============ */}
      <section className="container-x py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-ink to-ink-deep p-10 text-center text-white sm:p-14">
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Нужен расчёт под объект?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/70">
              Соберите корзину или позвоните — менеджер подготовит счёт, посчитает
              доставку и подберёт аналоги по наличию.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <LinkButton href="/catalog" size="lg">
                Открыть каталог <ArrowRight size={18} />
              </LinkButton>
              <a
                href={`tel:${site.phoneRaw}`}
                className="inline-flex h-13 items-center gap-2 rounded-lg border border-white/20 px-7 text-base font-semibold text-white hover:bg-white/10"
              >
                <Phone size={18} /> {site.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
