import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Truck,
  Scissors,
  ShieldCheck,
  PackageCheck,
  FileText,
  Phone,
} from "lucide-react";
import {
  getProductBySlug,
  getCategoryBySlug,
  getRelatedProducts,
} from "@/lib/queries";
import { formatPrice, priceUnit } from "@/lib/format";
import { site } from "@/lib/site";
import { AddToCart } from "@/components/cart/AddToCart";
import { CategoryIcon, iconBySlug } from "@/components/catalog/CategoryIcon";
import { ProductCardView } from "@/components/catalog/ProductCardView";
import { Breadcrumbs } from "@/app/catalog/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Товар не найден" };
  return {
    title: `${p.name} — цена в Санкт-Петербурге`,
    description: `${p.name}. ${p.steelGrade ?? ""} ${p.gost ?? ""}. Цена ${formatPrice(
      p.finalPrice
    )} ${priceUnit(p.unit)}. Со склада в СПб.`,
  };
}

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const cat = await getCategoryBySlug(product.categorySlug);
  const related = cat ? await getRelatedProducts(cat.id, product.id) : [];

  const specs = [
    product.steelGrade && { label: "Марка стали", value: product.steelGrade },
    product.size && { label: "Типоразмер", value: product.size },
    product.gost && { label: "Стандарт", value: product.gost },
    { label: "Единица", value: product.unit },
    { label: "Наличие", value: product.inStock ? "В наличии" : "Под заказ" },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="container-x py-8">
      <Breadcrumbs
        items={[
          { label: "Каталог", href: "/catalog" },
          { label: product.categoryName, href: `/catalog/${product.categorySlug}` },
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Визуал */}
        <div className="flex items-center justify-center rounded-card border border-line bg-surface p-12">
          <CategoryIcon iconKey={iconBySlug[product.categorySlug]} size={140} className="text-steel/30" />
        </div>

        {/* Инфо */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            {product.inStock ? (
              <span className="rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                В наличии на складе
              </span>
            ) : (
              <span className="rounded bg-steel/10 px-2.5 py-1 text-xs font-semibold text-steel">
                Под заказ
              </span>
            )}
            {product.gost && (
              <span className="rounded bg-surface px-2.5 py-1 text-xs font-medium text-steel">
                {product.gost}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{product.name}</h1>

          {/* Характеристики */}
          <dl className="mt-6 divide-y divide-line rounded-card border border-line">
            {specs.map((s) => (
              <div key={s.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <dt className="text-steel">{s.label}</dt>
                <dd className="font-semibold text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* Цена + корзина */}
          <div className="mt-6 rounded-card border border-line bg-white p-5">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-extrabold text-ink">
                {formatPrice(product.finalPrice)}
              </span>
              <span className="pb-1 text-sm text-steel">
                {priceUnit(product.unit)} {product.priceWithVat && "· с НДС"}
              </span>
            </div>
            <p className="mt-1 text-xs text-steel">
              Цена указана за 1 {product.unit}. Итог рассчитывается по количеству.
            </p>
            <div className="mt-4">
              <AddToCart
                product={{
                  productId: product.id,
                  name: product.name,
                  slug: product.slug,
                  unit: product.unit,
                  price: product.finalPrice,
                  size: product.size,
                  steelGrade: product.steelGrade,
                }}
                withQuantity
                size="lg"
                full
              />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-steel">
              <FileText size={14} /> Оформление заявки — выставим счёт, отсрочка для юрлиц
            </p>
          </div>

          {/* Доверие */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: PackageCheck, t: "Со склада" },
              { icon: Scissors, t: "Резка в размер" },
              { icon: Truck, t: "Доставка по СПб" },
              { icon: ShieldCheck, t: "Сертификат" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex flex-col items-center gap-1.5 rounded-lg bg-surface p-3 text-center">
                <Icon size={20} className="text-accent" />
                <span className="text-xs font-medium text-ink">{t}</span>
              </div>
            ))}
          </div>

          <a
            href={`tel:${site.phoneRaw}`}
            className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink hover:text-accent"
          >
            <Phone size={16} className="text-accent" /> Вопрос по позиции? {site.phone}
          </a>
        </div>
      </div>

      {/* Похожие */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-extrabold text-ink sm:text-2xl">
            Похожие позиции в разделе «{product.categoryName}»
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCardView key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
