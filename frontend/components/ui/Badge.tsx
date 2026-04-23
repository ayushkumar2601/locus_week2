import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  className?: string
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-green-900 text-green-300 border border-green-800': variant === 'success',
          'bg-yellow-900 text-yellow-300 border border-yellow-800': variant === 'warning',
          'bg-red-900 text-red-300 border border-red-800': variant === 'error',
          'bg-blue-900 text-blue-300 border border-blue-800': variant === 'info',
          'bg-gray-800 text-gray-300 border border-gray-700': variant === 'neutral',
        },
        className
      )}
    >
      {children}
    </span>
  )
}