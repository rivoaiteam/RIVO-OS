/**
 * Shared SidePanelWrapper component for slide-in panels.
 */

interface SidePanelWrapperProps {
  children: React.ReactNode
  onClose: () => void
}

export function SidePanelWrapper({ children, onClose }: SidePanelWrapperProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-1/2 min-w-[480px] max-w-[800px] bg-white z-50 shadow-xl flex flex-col animate-slide-in-right">
        {children}
      </div>
    </>
  )
}
