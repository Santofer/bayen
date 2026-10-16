import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Marché Pop : pilule à contour encre, ombre nette qui s'écrase au clic
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold ring-offset-background transition-[transform,box-shadow,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-2 border-encre bg-primary text-primary-foreground shadow-[3px_3px_0_var(--color-hard)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-hard)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        destructive: 'border-2 border-encre bg-tomate text-encre shadow-[3px_3px_0_var(--color-hard)] hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        outline: 'border-2 border-line bg-card text-foreground shadow-[2px_2px_0_var(--color-hard)] hover:-translate-y-px hover:bg-muted active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        secondary: 'border-2 border-encre bg-citron text-encre shadow-[2px_2px_0_var(--color-hard)] hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        ghost: 'hover:bg-muted',
        link: 'text-brand-ink underline underline-offset-4 decoration-2 decoration-menthe hover:decoration-current',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-3.5 text-[13px]',
        lg: 'h-12 px-7 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
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
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
