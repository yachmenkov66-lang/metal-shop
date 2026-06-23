/**
 * Единая точка правды по бренду и контактам.
 * ЗАМЕНИ плейсхолдеры на реальные данные компании перед запуском.
 */
export const site = {
  name: "СтальХауз",
  legalName: 'ООО «СтальХауз»',
  tagline: "Металлопрокат и металлоконструкции в Санкт-Петербурге",
  description:
    "Поставка металлопроката со склада в Санкт-Петербурге: арматура, балка, лист, труба, уголок, швеллер. Резка, доставка, отсрочка для юрлиц. Опт и розница.",

  city: "Санкт-Петербург",
  yearsOnMarket: 5,
  foundedYear: new Date().getFullYear() - 5,

  phone: "+7 (812) 000-00-00",
  phoneRaw: "+78120000000",
  email: "zakaz@stalhouse.ru",
  telegram: "stalhouse_spb",
  whatsapp: "+78120000000",

  address: "г. Санкт-Петербург, пр. Промышленный, д. 1",
  hours: "Пн–Пт 9:00–18:00, Сб 10:00–15:00",

  // Реквизиты (для счёта/футера) — заполнить реальными
  inn: "7800000000",
  ogrn: "1000000000000",

  // Источник данных каталога
  source: {
    label: "МЕТАЛЛСЕРВИС",
    url: "https://mc.ru/products/speterburg",
  },
} as const;

export const nav = [
  { href: "/catalog", label: "Каталог" },
  { href: "/#delivery", label: "Доставка и оплата" },
  { href: "/#about", label: "О компании" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/#contacts", label: "Контакты" },
] as const;
