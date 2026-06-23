/** Русские подписи и стили статусов заказов. Используется в админке. */

export type OrderStatus =
  | "NEW"
  | "PROCESSING"
  | "INVOICED"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Новая заявка",
  PROCESSING: "В работе",
  INVOICED: "Счёт выставлен",
  COMPLETED: "Выполнен",
  CANCELLED: "Отменён",
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

/** Tailwind-классы бейджа под каждый статус (в палитре дизайн-системы). */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  NEW: "bg-accent-soft text-accent",
  PROCESSING: "bg-ink text-white",
  INVOICED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-surface text-steel",
};
