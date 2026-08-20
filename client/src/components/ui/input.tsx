import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // R0 : champ 48px, radius 14, bordure 1px — 2px menthe au focus.
          "flex h-11 w-full rounded-lg border border-input bg-card px-4 py-2 text-[15px] text-foreground transition-[border-color,box-shadow] duration-fast ease-ro file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[color:var(--ro-text-low)] focus-visible:outline-none focus-visible:border-mint-500 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-[#E4E4E7] disabled:text-[#A0A0A8] dark:disabled:bg-ink-700 dark:disabled:text-ink-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
