import { useState } from 'react'
import { cn } from '@/lib/cn'

const FALLBACK_SRC = '/assets/logo-amd.png'

const SVG_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#E05A2C" width="80" height="80" rx="16"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="28" font-weight="700">AMD</text></svg>`,
  )

const sizeClass = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
} as const

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: keyof typeof sizeClass
  className?: string
}) {
  const [src, setSrc] = useState('/logo.png')

  return (
    <img
      src={src}
      alt=""
      width={80}
      height={80}
      className={cn(sizeClass[size], 'object-contain select-none', className)}
      onError={() => {
        if (src === '/logo.png') setSrc(FALLBACK_SRC)
        else if (src === FALLBACK_SRC) setSrc(SVG_PLACEHOLDER)
      }}
    />
  )
}
