import Link from "next/link";
import type { ProductCard } from "@/lib/queries";
import { formatPrice, priceUnit } from "@/lib/format";
import { AddToCart } from "../cart/AddToCart";
import { CategoryIcon, iconBySlug } from "./CategoryIcon";

export function ProductCardView({ product }: { product: ProductCard }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-shadow hover:shadow-lg hover:shadow-ink/5">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative flex h-32 items-center justify-center bg-surface text-steel/40">
          <CategoryIcon iconKey={iconBySlug[product.categorySlug]} size={56} />
          {!product.inStock && (
            <span className="absolute left-3 top-3 rounded bg-steel/90 px-2 py-0.5 text-[11px] font-semibold text-white">
              под заказ
            </span>
          )}
          {product.inStock && (
            <span className="absolute left-3 top-3 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              в наличии
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.slug}`} className="block">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-accent">
            {product.name}
          </h3>
        </Link>
        <dl className="mt-2 space-y-0.5 text-xs text-steel">
          {product.steelGrade && (
            <div className="flex gap-1">
              <dt className="text-steel/70">Марка:</dt>
              <dd className="text-ink/80">{product.steelGrade}</dd>
            </div>
          )}
          {product.gost && (
            <div className="flex gap-1">
              <dt className="text-steel/70">Стандарт:</dt>
              <dd className="text-ink/80">{product.gost}</dd>
            </div>
          )}
        </dl>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-extrabold text-ink">
              {formatPrice(product.finalPrice)}
            </div>
            <div className="text-xs text-steel">{priceUnit(product.unit)} · с НДС</div>
          </div>
        </div>

        <div className="mt-3">
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
            size="sm"
            full
          />
        </div>
      </div>
    </div>
  );
}
