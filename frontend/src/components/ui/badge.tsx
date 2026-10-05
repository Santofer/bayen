import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-encre bg-primary text-primary-foreground',
        secondary: 'border-line bg-secondary text-secondary-foreground',
        destructive: 'border-encre bg-tomate text-encre',
        outline: 'border-line bg-card text-foreground',
        safe: 'border-encre bg-score-excellent text-encre',
        limited: 'border-encre bg-score-mediocre text-encre',
        avoid: 'border-encre bg-score-mauvais text-encre',
        banned: 'border-encre bg-encre text-creme dark:bg-creme dark:text-encre',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
