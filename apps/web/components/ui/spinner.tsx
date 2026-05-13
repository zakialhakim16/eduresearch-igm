import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

type SpinnerProps = {
  className?: string
  'aria-label'?: string
}

export function Spinner({
  className,
  'aria-label': ariaLabel = 'Memuat',
}: SpinnerProps) {
  return (
    <Loader2
      className={cn('h-4 w-4 shrink-0 animate-spin', className)}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    />
  )
}
