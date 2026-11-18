import Link from "next/link"
import { cn } from "@/lib/utils"

type Variant = "primary" | "outline" | "ghost" | "secondary"
type Size = "sm" | "md" | "lg" | "icon"

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  outline: "border border-border bg-card text-foreground shadow-sm hover:bg-muted",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
  ghost: "text-foreground hover:bg-muted",
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-caption",
  md: "h-10 px-4 text-label",
  lg: "h-12 rounded-xl px-6 text-body",
  icon: "h-10 w-10",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  href?: string
}

/** Wireframe button. Renders a link when `href` is set. */
export function Button({ variant = "primary", size = "md", href, className, ...props }: ButtonProps) {
  const classes = cn(
    "focus-ring inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-fast disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  )
  if (href) {
    return (
      <Link href={href} className={classes} aria-label={props["aria-label"]}>
        {props.children}
      </Link>
    )
  }
  return <button type="button" className={classes} {...props} />
}
