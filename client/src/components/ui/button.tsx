import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-mono tracking-wider uppercase transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground cyber-glow-hover",
        destructive:
          "bg-transparent border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-background cyber-glow-hover",
        outline:
          "bg-transparent border border-primary/40 text-foreground hover:border-primary hover:text-primary cyber-glow-hover",
        secondary:
          "bg-transparent border border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground hover:text-foreground",
        ghost: 
          "bg-transparent border border-transparent text-muted-foreground hover:text-primary hover:border-primary/30",
        link: 
          "text-primary underline-offset-4 hover:underline border-none bg-transparent",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
