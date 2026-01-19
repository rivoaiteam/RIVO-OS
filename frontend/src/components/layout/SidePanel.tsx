import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLayout } from '@/contexts/LayoutContext'

interface SidePanelProps {
  isOpen?: boolean
  onClose?: () => void
  title?: string
  children?: ReactNode
  className?: string
}

export function SidePanel({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  title: controlledTitle,
  children: controlledChildren,
  className,
}: SidePanelProps) {
  const {
    sidePanelOpen,
    sidePanelTitle,
    sidePanelContent,
    closeSidePanel,
    isMobile,
  } = useLayout()

  // Use controlled props if provided, otherwise use context
  const isOpen = controlledIsOpen ?? sidePanelOpen
  const onClose = controlledOnClose ?? closeSidePanel
  const title = controlledTitle ?? sidePanelTitle
  const children = controlledChildren ?? sidePanelContent

  const panelRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    },
    [isOpen, onClose]
  )

  // Handle click outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose()
      }
    },
    [isOpen, onClose]
  )

  // Focus trapping
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement

      // Add event listeners
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('mousedown', handleClickOutside)

      // Focus the panel
      if (panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstFocusable = focusableElements[0] as HTMLElement
        firstFocusable?.focus()
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    } else {
      // Return focus to previous element
      previousActiveElement.current?.focus()
    }
  }, [isOpen, handleKeyDown, handleClickOutside])

  // Focus trap handler
  const handleFocusTrap = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !panelRef.current) return

    const focusableElements = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable?.focus()
      }
    }
  }, [])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
        onKeyDown={handleFocusTrap}
        className={cn(
          'fixed top-header right-0 bottom-0 z-50',
          'bg-white border-l border-gray-200 shadow-lg',
          'flex flex-col',
          'transform transition-transform duration-200 ease-in-out',
          isMobile ? 'w-full' : 'w-side-panel',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="side-panel-title"
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  )
}
