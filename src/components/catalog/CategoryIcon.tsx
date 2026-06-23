/** Сопоставление слага категории → ключ иконки (фолбэк, если iconKey не задан в БД). */
export const iconBySlug: Record<string, string> = {
  armatura: "rebar",
  balka: "beam",
  list: "sheet",
  truba: "pipe",
  ugolok: "angle",
  shveller: "channel",
  krug: "circle",
  kvadrat: "square",
  polosa: "strip",
  profnastil: "roof",
};

/** Кастомные SVG-сечения металлопроката. Цвет — currentColor. */
export function CategoryIcon({
  iconKey,
  size = 28,
  className,
}: {
  iconKey: string | null;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (iconKey) {
    case "beam": // двутавр
      return (
        <svg {...common}>
          <path d="M7 6h18M7 26h18M16 6v20M11 6v0M21 6v0" />
          <path d="M7 6v3M25 6v3M7 26v-3M25 26v-3" />
        </svg>
      );
    case "angle": // уголок L
      return (
        <svg {...common}>
          <path d="M9 5v22h18" />
          <path d="M9 5h4v18h14" strokeWidth={1.4} opacity={0.5} />
        </svg>
      );
    case "channel": // швеллер [
      return (
        <svg {...common}>
          <path d="M22 5H8v22h14" />
          <path d="M22 9H12v14h10" strokeWidth={1.4} opacity={0.5} />
        </svg>
      );
    case "pipe": // труба (кольцо)
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="11" />
          <circle cx="16" cy="16" r="6" strokeWidth={1.6} opacity={0.6} />
        </svg>
      );
    case "circle": // круг
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="11" />
          <circle cx="16" cy="16" r="3" strokeWidth={1.4} opacity={0.4} />
        </svg>
      );
    case "square": // квадрат
      return (
        <svg {...common}>
          <rect x="6" y="6" width="20" height="20" rx="2" />
        </svg>
      );
    case "sheet": // лист
      return (
        <svg {...common}>
          <path d="M4 12l12-5 12 5-12 5z" />
          <path d="M4 12v5l12 5 12-5v-5" strokeWidth={1.6} opacity={0.6} />
        </svg>
      );
    case "strip": // полоса
      return (
        <svg {...common}>
          <rect x="4" y="13" width="24" height="6" rx="1.5" />
        </svg>
      );
    case "rebar": // арматура
      return (
        <svg {...common}>
          <rect x="12" y="4" width="8" height="24" rx="4" />
          <path d="M12 9l8 3M12 15l8 3M12 21l8 3" strokeWidth={1.4} opacity={0.6} />
        </svg>
      );
    case "roof": // профнастил
      return (
        <svg {...common}>
          <path d="M3 20l4-8 4 8 4-8 4 8 4-8 4 8" />
        </svg>
      );
    default: // generic
      return (
        <svg {...common}>
          <rect x="6" y="6" width="20" height="20" rx="3" />
          <path d="M11 16h10" strokeWidth={1.6} opacity={0.6} />
        </svg>
      );
  }
}
