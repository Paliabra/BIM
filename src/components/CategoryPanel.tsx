import { useMemo, useState } from 'react'
import type { SceneGraph } from '../core/SceneGraph'
import { IFC_TYPE_LABELS } from '../types/ifc-entities'

interface CategoryPanelProps {
  graph: SceneGraph
  /** Incremented after each model DONE event to trigger recompute */
  version: number
}

/**
 * Shows IFC type categories with object counts and visibility toggles.
 * Types are sorted by object count (most frequent first).
 */
export function CategoryPanel({ graph, version }: CategoryPanelProps) {
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())

  const types = useMemo(() => {
    const counts = new Map<string, { count: number; typeCode: number }>()
    for (const obj of graph.values()) {
      const entry = counts.get(obj.ifcType)
      if (entry) {
        entry.count++
      } else {
        counts.set(obj.ifcType, { count: 1, typeCode: obj.ifcTypeCode })
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([ifcType, { count, typeCode }]) => ({
        ifcType,
        typeCode,
        count,
        label: IFC_TYPE_LABELS[typeCode] ?? ifcType.replace('Ifc', ''),
      }))
    // version is the trigger; graph is stable reference but mutates internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, version])

  if (types.length === 0) return null

  const toggle = (ifcType: string) => {
    const isHidden = hiddenTypes.has(ifcType)
    // isHidden=true means currently hidden, making visible again
    const becomingVisible = isHidden
    const next = new Set(hiddenTypes)
    if (isHidden) {
      next.delete(ifcType)
    } else {
      next.add(ifcType)
    }
    setHiddenTypes(next)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).__bim_setTypeVisibility?.(ifcType, becomingVisible)
  }

  return (
    <div className="space-y-0.5">
      {types.map(({ ifcType, label, count }) => {
        const visible = !hiddenTypes.has(ifcType)
        return (
          <div
            key={ifcType}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-surface-600 group"
          >
            <span
              className="text-surface-300 text-xs truncate flex-1 min-w-0"
              title={ifcType}
            >
              {label}
            </span>
            <span className="text-surface-400 text-xs font-mono shrink-0">
              {count.toLocaleString('fr-FR')}
            </span>
            <button
              onClick={() => toggle(ifcType)}
              className="text-surface-400 hover:text-white shrink-0 transition-colors"
              title={visible ? 'Masquer' : 'Afficher'}
            >
              {visible ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 opacity-40" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                    clipRule="evenodd"
                  />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
