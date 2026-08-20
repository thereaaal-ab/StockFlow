import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * R0 — le badge est une pill en Geist Mono : 10,5px / 0.10em / 700 / uppercase,
 * zéro barré. Un badge dit UN mot : « Prête », pas « Commande prête ».
 *
 * success / warning / error / info sont des états de feedback, jamais des
 * actions : ils colorent un badge, un bandeau ou une bordure de ticket.
 */
const badgeVariants = cva(
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5" +
  " font-mono text-[10.5px] font-bold uppercase tracking-label" +
  " transition-colors duration-fast ease-ro focus:outline-none focus:shadow-focus",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ink-850 text-white dark:bg-[#F6F8F7] dark:text-ink-850",
        brand:
          "border-transparent bg-brand-500 text-ink-850",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-[color:var(--ro-feedback-error-bd)] bg-[color:var(--ro-feedback-error-bg)] text-[color:var(--ro-feedback-error-fg)]",
        success:
          "border-[color:var(--ro-feedback-success-bd)] bg-[color:var(--ro-feedback-success-bg)] text-[color:var(--ro-feedback-success-fg)]",
        warning:
          "border-[color:var(--ro-feedback-warning-bd)] bg-[color:var(--ro-feedback-warning-bg)] text-[color:var(--ro-feedback-warning-fg)]",
        info:
          "border-[color:var(--ro-feedback-info-bd)] bg-[color:var(--ro-feedback-info-bg)] text-[color:var(--ro-feedback-info-fg)]",
        outline:
          "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }
