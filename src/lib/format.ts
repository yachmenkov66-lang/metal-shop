/** Форматирование для русскоязычного интерфейса. */

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const numFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
});

/** «12 500 ₽» (округляем до рубля для витрины) */
export function formatPrice(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return "—";
  return rubFormatter.format(n);
}

/** «1 250,5» */
export function formatNumber(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return "—";
  return numFormatter.format(n);
}

/** Русское склонение: plural(2, 'товар','товара','товаров') -> 'товара' */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** «3 товара» */
export function pluralWithCount(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  return `${formatNumber(count)} ${plural(count, one, few, many)}`;
}

/** Единица измерения с ценой: «₽/т», «₽/м», «₽/шт» */
export function priceUnit(unit: string): string {
  return `₽/${unit}`;
}
