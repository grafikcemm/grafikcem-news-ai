"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all duration-150 ease-in-out outline-none select-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-subtle)] active:translate-y-px disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_0_0_0_var(--accent-glow)] hover:shadow-[0_0_12px_var(--accent-glow)]",
        secondary: "bg-[var(--surface-elevated)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-overlay)]",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]",
        destructive: "bg-[var(--danger-subtle)] text-[var(--danger)] border-[var(--danger-muted)] hover:bg-[var(--danger-muted)]",
        outline: "bg-transparent text-[var(--text-primary)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "px-[16px] py-[8px] text-[13px] gap-2",
        sm: "px-[12px] py-[6px] text-[12px] gap-1.5",
        md: "px-[16px] py-[8px] text-[13px] gap-2",
        lg: "px-[20px] py-[10px] text-[14px] gap-2",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
