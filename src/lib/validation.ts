import { z } from "zod";

const phone = z
  .string()
  .trim()
  .min(10, "Укажите телефон")
  .max(20)
  .regex(/^[\d\s()+-]+$/, "Некорректный телефон");

export const registerSchema = z.object({
  lastName: z.string().trim().min(1, "Укажите фамилию").max(60),
  firstName: z.string().trim().min(1, "Укажите имя").max(60),
  phone,
  telegram: z
    .string()
    .trim()
    .max(64)
    .optional()
    .or(z.literal("")),
  email: z.string().trim().toLowerCase().email("Некорректная почта"),
  password: z.string().min(6, "Минимум 6 символов").max(100),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  inn: z.string().trim().max(12).optional().or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Некорректная почта"),
  password: z.string().min(1, "Введите пароль"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const orderSchema = z.object({
  customerName: z.string().trim().min(1, "Укажите ФИО / контактное лицо").max(120),
  phone,
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  telegram: z.string().trim().max(64).optional().or(z.literal("")),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  inn: z.string().trim().max(12).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive().max(1_000_000),
      })
    )
    .min(1, "Корзина пуста"),
});
export type OrderInput = z.infer<typeof orderSchema>;

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive().max(1_000_000),
});
