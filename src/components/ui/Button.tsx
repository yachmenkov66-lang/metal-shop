import Link from "next/link";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-white text-ink border border-line hover:border-ink/30 hover:bg-surface",
  ghost: "bg-transparent text-ink hover:bg-surface",
  dark: "bg-ink text-white hover:bg-ink-deep",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(opts?: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return clsx(
    base,
    variants[opts?.variant ?? "primary"],
    sizes[opts?.size ?? "md"],
    opts?.className
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};
export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};
export function LinkButton({
  variant,
  size,
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
