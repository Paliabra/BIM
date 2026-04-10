interface LoadingOverlayProps {
  filename: string
  percent: number
  count: number
  discipline: string
}

/**
 * Full-screen loading overlay shown during IFC parsing.
 * Progress values come from the Worker (real, not fake).
 */
export function LoadingOverlay({ filename, percent, count, discipline }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-surface-900/90 backdrop-blur-sm">
      <div className="w-72 flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="w-10 h-10 border-2 border-surface-500 border-t-accent rounded-full animate-spin" />

        {/* Filename */}
        <div className="text-center">
          <p className="text-white text-sm font-semibold truncate max-w-[260px]" title={filename}>
            {filename}
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-surface-600 rounded text-xs text-surface-300 font-mono">
            {discipline}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-600 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-200 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between w-full text-xs text-surface-400 font-mono">
          <span>{Math.round(percent)}%</span>
          {count > 0 && <span>{count.toLocaleString('fr-FR')} objets</span>}
        </div>
      </div>
    </div>
  )
}
