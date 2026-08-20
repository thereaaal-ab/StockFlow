import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * R0 — hiérarchie à deux axes : emphasis (poids visuel) × intent (nature de
 * l'action). Les variantes ci-dessous sont les combinaisons utilisées dans
 * l'app, exprimées avec les noms shadcn pour ne rien casser :
 *
 *   default     = bold  × neutral  (encre)   — l'action qui fait avancer
 *   brand       = bold  × brand    (jaune)   — argent et marque UNIQUEMENT
 *   accent      = bold  × accent   (menthe)  — actions de service
 *   destructive = bold  × danger   (rouge)
 *   secondary   = subtle × neutral
 *   outline     = outline × neutral
 *   ghost       = ghost × neutral
 *   link        = plain × accent
 *
 * Règle : un seul `bold` par écran. Le texte sur jaune est TOUJOURS l'encre.
 * Boutons = pills. Appui = scale(0.97), le seul retour tactile du système.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold" +
  " transition-[color,background-color,border-color,box-shadow,transform] duration-fast ease-ro" +
  " focus-visible:outline-none focus-visible:shadow-focus" +
  " disabled:pointer-events-none disabled:border-transparent disabled:bg-[#E4E4E7] disabled:text-[#A0A0A8] disabled:shadow-none" +
  " dark:disabled:bg-ink-700 dark:disabled:text-ink-500" +
  " active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-ink-850 text-white border border-ink-850 shadow-sm hover:bg-[#212E4E] hover:border-[#212E4E] dark:bg-[#F6F8F7] dark:text-ink-850 dark:border-[#F6F8F7] dark:hover:bg-[#D5D9E4] dark:hover:border-[#D5D9E4]",
        brand:
          "bg-brand-500 text-ink-850 border border-brand-500 shadow-brand hover:bg-brand-600 hover:border-brand-600",
        accent:
          "bg-mint-500 text-white border border-mint-500 hover:bg-mint-600 hover:border-mint-600",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive shadow-danger hover:bg-[#C93B40] hover:border-[#C93B40]",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-[#E4E4E7] dark:hover:bg-ink-700",
        ghost:
          "border border-transparent bg-transparent text-foreground shadow-none hover:bg-muted",
        link:
          "border-0 bg-transparent text-mint-600 shadow-none rounded-none px-0 underline-offset-4 hover:underline dark:text-mint-500",
      },
      size: {
        // hauteurs R0 : sm 32 / md 40 / lg 52 · cible tactile 44
        sm: "h-8 px-4 text-[13.5px]",
        default: "h-10 px-6 text-[15px]",
        lg: "h-[52px] px-7 text-[17px]",
        touch: "min-h-[44px] px-6 text-[15px]",
        icon: "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
