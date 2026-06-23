import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_MARKUP = 10;
const applyMarkup = (base: number, pct: number) =>
  Math.round(base * (1 + pct / 100) * 100) / 100;

type Cat = {
  slug: string;
  name: string;
  iconKey: string;
  description: string;
};

const categories: Cat[] = [
  { slug: "armatura", name: "Арматура", iconKey: "rebar", description: "Арматура рифлёная и гладкая А500С, А240, А400. ГОСТ 34028-2016." },
  { slug: "balka", name: "Балка (двутавр)", iconKey: "beam", description: "Балка двутавровая горячекатаная Б, Ш, К. Ст3, 09Г2С." },
  { slug: "list", name: "Лист", iconKey: "sheet", description: "Лист горячекатаный и холоднокатаный, рифлёный, оцинкованный." },
  { slug: "truba", name: "Труба", iconKey: "pipe", description: "Труба профильная, электросварная, ВГП, бесшовная." },
  { slug: "ugolok", name: "Уголок", iconKey: "angle", description: "Уголок равнополочный и неравнополочный. ГОСТ 8509-93." },
  { slug: "shveller", name: "Швеллер", iconKey: "channel", description: "Швеллер горячекатаный П и У. ГОСТ 8240-97." },
  { slug: "krug", name: "Круг", iconKey: "circle", description: "Круг стальной горячекатаный. ГОСТ 2590-2006." },
  { slug: "kvadrat", name: "Квадрат", iconKey: "square", description: "Квадрат стальной горячекатаный. ГОСТ 2591-2006." },
  { slug: "polosa", name: "Полоса", iconKey: "strip", description: "Полоса стальная горячекатаная. ГОСТ 103-2006." },
  { slug: "profnastil", name: "Профнастил", iconKey: "roof", description: "Профнастил кровельный и стеновой С8, С21, НС35, Н60." },
];

// Генератор товаров: [категория, [товары...]]
type P = {
  name: string;
  size: string;
  steel: string;
  gost: string;
  unit: string;
  base: number;
};

function rebar(): P[] {
  return [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32].map((d) => ({
    name: `Арматура А500С ⌀${d} мм`,
    size: `${d}`,
    steel: "А500С",
    gost: "ГОСТ 34028-2016",
    unit: "т",
    base: 48500 + (d <= 10 ? 4500 : d <= 16 ? 1500 : 0),
  }));
}
function beam(): P[] {
  return [
    ["10Б1", 66800], ["12Б1", 65900], ["14Б1", 65500], ["16Б1", 65200],
    ["18Б1", 64900], ["20Б1", 64700], ["25Б1", 65800], ["30Б1", 66900],
    ["35Б1", 68500], ["20К1", 70200], ["25К1", 71500],
  ].map(([s, b]) => ({
    name: `Балка двутавровая ${s}`,
    size: String(s),
    steel: "Ст3сп/пс5",
    gost: "СТО АСЧМ 20-93",
    unit: "т",
    base: b as number,
  }));
}
function sheet(): P[] {
  const hot = [1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((t) => ({
    name: `Лист г/к ${t} мм`,
    size: `${t}`,
    steel: "Ст3сп",
    gost: "ГОСТ 19903-2015",
    unit: "т",
    base: 60500 + (t < 3 ? 5500 : 0),
  }));
  const cold = [0.5, 0.7, 0.8, 1, 1.5, 2].map((t) => ({
    name: `Лист х/к ${t} мм`,
    size: `${t}`,
    steel: "08пс",
    gost: "ГОСТ 19904-90",
    unit: "т",
    base: 72000 + (t < 1 ? 8000 : 0),
  }));
  const ribbed = [3, 4, 5, 6].map((t) => ({
    name: `Лист рифлёный ${t} мм`,
    size: `${t}`,
    steel: "Ст3сп",
    gost: "ГОСТ 8568-77",
    unit: "т",
    base: 63500,
  }));
  return [...hot, ...cold, ...ribbed];
}
function pipe(): P[] {
  const prof = [
    ["40x20x2", 64], ["40x40x2", 63], ["50x25x2", 64], ["60x40x2", 62],
    ["60x60x3", 61], ["80x80x4", 61], ["100x100x4", 62], ["100x50x3", 62],
  ].map(([s, b]) => ({
    name: `Труба профильная ${s}`,
    size: String(s),
    steel: "Ст3",
    gost: "ГОСТ 30245-2003",
    unit: "м",
    base: b as number,
  }));
  const elsw = [
    ["57x3.5", 285], ["76x3.5", 360], ["89x4", 470], ["108x4", 560], ["159x4.5", 880],
  ].map(([s, b]) => ({
    name: `Труба электросварная ⌀${s}`,
    size: String(s),
    steel: "Ст3",
    gost: "ГОСТ 10704-91",
    unit: "м",
    base: b as number,
  }));
  const vgp = [
    ["15x2.8", 120], ["20x2.8", 150], ["25x3.2", 205], ["32x3.2", 255], ["40x3.5", 330],
  ].map(([s, b]) => ({
    name: `Труба ВГП ⌀${s}`,
    size: String(s),
    steel: "Ст3",
    gost: "ГОСТ 3262-75",
    unit: "м",
    base: b as number,
  }));
  return [...prof, ...elsw, ...vgp];
}
function angle(): P[] {
  return [
    ["25x25x4", 61500], ["32x32x4", 60800], ["40x40x4", 60200], ["45x45x5", 60500],
    ["50x50x5", 60000], ["63x63x5", 60300], ["63x63x6", 60800], ["75x75x6", 61200],
    ["90x90x7", 62500], ["100x100x8", 63200], ["125x125x8", 64800],
  ].map(([s, b]) => ({
    name: `Уголок ${s}`,
    size: String(s),
    steel: "Ст3сп/пс",
    gost: "ГОСТ 8509-93",
    unit: "т",
    base: b as number,
  }));
}
function channel(): P[] {
  return ["6.5", "8", "10", "12", "14", "16", "16а", "18", "20", "22", "24", "27", "30"].map(
    (n) => ({
      name: `Швеллер ${n}П`,
      size: n,
      steel: "Ст3сп/пс5",
      gost: "ГОСТ 8240-97",
      unit: "т",
      base: 65500 + (parseFloat(n) >= 20 ? 2500 : 0),
    })
  );
}
function circle(): P[] {
  return [10, 12, 14, 16, 18, 20, 25, 30, 36, 40, 50].map((d) => ({
    name: `Круг ⌀${d} мм`,
    size: `${d}`,
    steel: "Ст3сп",
    gost: "ГОСТ 2590-2006",
    unit: "т",
    base: 56500,
  }));
}
function square(): P[] {
  return [10, 12, 14, 16, 20, 25].map((d) => ({
    name: `Квадрат ${d} мм`,
    size: `${d}`,
    steel: "Ст3сп",
    gost: "ГОСТ 2591-2006",
    unit: "т",
    base: 57500,
  }));
}
function strip(): P[] {
  return [
    "40x4", "40x5", "50x5", "50x6", "60x6", "80x8", "100x10",
  ].map((s) => ({
    name: `Полоса ${s}`,
    size: s,
    steel: "Ст3сп",
    gost: "ГОСТ 103-2006",
    unit: "т",
    base: 59500,
  }));
}
function roof(): P[] {
  return [
    ["С8-1150 0.45", absM2(545)], ["С21-1000 0.5", absM2(640)],
    ["НС35-1000 0.5", absM2(720)], ["Н60-845 0.7", absM2(1080)],
    ["С8-1150 0.5 RAL", absM2(690)],
  ].map(([s, b]) => ({
    name: `Профнастил ${s}`,
    size: String(s),
    steel: "оцинк./полиэстер",
    gost: "ГОСТ 24045-2016",
    unit: "м²",
    base: b as number,
  }));
}
function absM2(n: number) {
  return n;
}

const productMap: Record<string, P[]> = {
  armatura: rebar(),
  balka: beam(),
  list: sheet(),
  truba: pipe(),
  ugolok: angle(),
  shveller: channel(),
  krug: circle(),
  kvadrat: square(),
  polosa: strip(),
  profnastil: roof(),
};

const reviews = [
  { authorName: "Алексей Морозов", rating: 5, source: "Яндекс Карты", text: "Брали арматуру и швеллер на фундамент склада в Шушарах. Цена оказалась ниже, чем у двух других поставщиков, плюс привезли манипулятором ровно в срок. Менеджер Сергей помог пересчитать метраж в тонны — видно, что в теме. Работаем дальше." },
  { authorName: "ООО «СтройМонтаж»", rating: 5, source: "2ГИС", text: "Закупаем металл регулярно под объекты. Отдельный плюс — отсрочка платежа для юрлиц и нормальные закрывающие документы без задержек. За полтора года ни одной пересортицы. Рекомендую как надёжного партнёра." },
  { authorName: "Дмитрий К.", rating: 5, source: "Яндекс Карты", text: "Нужен был лист г/к 8 мм и резка в размер. Сделали раскрой за день, кромка чистая. Забрал самовывозом с Промышленной — погрузили быстро, очередей нет. Доволен." },
  { authorName: "Игорь Васильев", rating: 4, source: "Google", text: "В целом всё хорошо: цены адекватные, труба профильная была в наличии вся. Снял звезду только потому, что доставку пришлось ждать на пару часов дольше окна. По качеству металла претензий нет." },
  { authorName: "Марина (частный дом)", rating: 5, source: "Яндекс Карты", text: "Заказывала профнастил на забор и уголок. Боялась, что с физлицом возиться не будут, но проконсультировали как родную, помогли подобрать цвет RAL. Привезли в СНТ под Гатчиной аккуратно, ничего не помяли." },
  { authorName: "Роман, прораб", rating: 5, source: "2ГИС", text: "Работаю с ними третий объект. Главное — наличие на складе реальное, а не «привезём через неделю». Балку 25Б1 и швеллер забрали в день обращения. Менеджеры отвечают быстро, в том числе в Телеграм." },
  { authorName: "ИП Кузнецов А.В.", rating: 5, source: "Google", text: "Адекватный поставщик металлопроката в СПб. Сравнивал прайс с биржей — наценка честная, без сюрпризов в счёте. Понравилось, что цены на сайте обновляются, приехал — всё совпало." },
  { authorName: "Сергей Тихонов", rating: 4, source: "Яндекс Карты", text: "Брал круг и квадрат под токарку. Качество стали соответствует, ГОСТ свой. Хотелось бы чуть больше позиций нержавейки в наличии, но по чёрному металлу выбор отличный. Вернусь ещё." },
  { authorName: "ООО «ТеплоДом»", rating: 5, source: "2ГИС", text: "Берём трубу и лист под производство. Ценим за стабильность: оговоренная цена не «уплывает» к моменту отгрузки. Логистика по городу налажена, водители вежливые. Пять лет на рынке чувствуются по уровню сервиса." },
  { authorName: "Андрей П.", rating: 5, source: "Google", text: "Заказал арматуру А500С на ленточный фундамент, 1.2 тонны. Посчитали, нарезали по длинам, привезли в Колпино на следующий день. Дешевле, чем в строительных гипермаркетах, и без беготни. Спасибо команде!" },
];

async function main() {
  console.log("🌱 Сидирование базы…");

  // Настройки
  await prisma.setting.upsert({
    where: { key: "default_markup_percent" },
    update: {},
    create: { key: "default_markup_percent", value: String(DEFAULT_MARKUP) },
  });

  // Категории
  let sort = 0;
  const catIdBySlug: Record<string, number> = {};
  for (const c of categories) {
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, iconKey: c.iconKey, description: c.description, sortOrder: sort },
      create: {
        slug: c.slug,
        name: c.name,
        iconKey: c.iconKey,
        description: c.description,
        sortOrder: sort,
      },
    });
    catIdBySlug[c.slug] = created.id;
    sort++;
  }

  // Товары
  let total = 0;
  for (const [slug, products] of Object.entries(productMap)) {
    const categoryId = catIdBySlug[slug];
    let i = 0;
    for (const p of products) {
      const finalPrice = applyMarkup(p.base, DEFAULT_MARKUP);
      const externalId = `seed-${slug}-${i}`;
      const productSlug = `${slug}-${p.size.replace(/[^a-zа-я0-9.]+/gi, "-").toLowerCase()}-${i}`;
      await prisma.product.upsert({
        where: { externalId },
        update: {
          basePrice: new Prisma.Decimal(p.base),
          finalPrice: new Prisma.Decimal(finalPrice),
        },
        create: {
          externalId,
          slug: productSlug,
          name: p.name,
          categoryId,
          size: p.size,
          steelGrade: p.steel,
          gost: p.gost,
          unit: p.unit,
          basePrice: new Prisma.Decimal(p.base),
          finalPrice: new Prisma.Decimal(finalPrice),
          priceWithVat: true,
          inStock: true,
          stockText: "в наличии",
          sourceUrl: "https://mc.ru/products/speterburg",
          lastScrapedAt: new Date(),
        },
      });
      i++;
      total++;
    }
  }

  // Отзывы
  await prisma.review.deleteMany({});
  let rs = 0;
  for (const r of reviews) {
    await prisma.review.create({ data: { ...r, sortOrder: rs++ } });
  }

  // Админ
  const adminEmail = "admin@stalhouse.ru";
  const adminPass = "admin12345";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPass, 10),
      lastName: "Администратор",
      firstName: "Сайта",
      phone: "+7 (812) 000-00-00",
      role: "ADMIN",
    },
  });

  console.log(`✅ Категорий: ${categories.length}, товаров: ${total}, отзывов: ${reviews.length}`);
  console.log(`👤 Админ: ${adminEmail} / ${adminPass} (СМЕНИТЬ пароль!)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
