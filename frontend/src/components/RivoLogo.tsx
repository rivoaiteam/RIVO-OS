import { cn } from '@/lib/utils'

interface RivoLogoProps {
  className?: string
  showText?: boolean
  iconOnly?: boolean
}

export function RivoLogo({ className, showText = true, iconOnly = false }: RivoLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* House/R Icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Outer house shape */}
        <path
          d="M20 4L4 16V36H36V16L20 4Z"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner diagonal line forming R */}
        <path
          d="M12 36V20L28 36"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Chimney/top element */}
        <path
          d="M28 12V8H24V14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>

      {/* Rivo Text */}
      {showText && !iconOnly && (
        <span className="text-xl font-semibold tracking-tight text-gray-900">
          Rivo
          <sup className="text-[8px] ml-0.5 align-super text-gray-500">TM</sup>
        </span>
      )}
    </div>
  )
}
