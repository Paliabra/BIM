import { useState } from 'react'
import type { SceneGraph } from '../core/SceneGraph'
import type { SectionAxis } from '../renderer/SectionPlane'

interface SectionControlsProps {
  graph: SceneGraph
  onSectionChange: (axis: SectionAxis | null, position: number) => void
}

/**
 * X/Y/Z section plane controls with position slider.
 * Reads global bbox from SceneGraph to compute slider range on axis activation.
 */
export function SectionControls({ graph, onSectionChange }: SectionControlsProps) {
  const [activeAxis, setActiveAxis] = useState<SectionAxis | null>(null)
  const [position, setPosition] = useState(0)
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 10])

  const getBboxRange = (axis: SectionAxis): [number, number] => {
    const bbox = graph.globalBbox()
    if (bbox.isEmpty()) return [-100, 100]
    if (axis === 'X') return [bbox.min.x, bbox.max.x]
    if (axis === 'Y') return [bbox.min.y, bbox.max.y]
    return [bbox.min.z, bbox.max.z]
  }

  const activateAxis = (axis: SectionAxis) => {
    const newAxis = activeAxis === axis ? null : axis
    setActiveAxis(newAxis)
    if (newAxis === null) {
      onSectionChange(null, 0)
    } else {
      const range = getBboxRange(newAxis)
      const mid = (range[0] + range[1]) / 2
      setSliderRange(range)
      setPosition(mid)
      onSectionChange(newAxis, mid)
    }
  }

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setPosition(val)
    if (activeAxis) onSectionChange(activeAxis, val)
  }

  const [min, max] = sliderRange
  const step = Math.max((max - min) / 200, 0.001)

  return (
    <div className="px-2 py-2 space-y-2">
      {/* Axis selector */}
      <div className="flex gap-1.5">
        {(['X', 'Y', 'Z'] as SectionAxis[]).map((axis) => (
          <button
            key={axis}
            onClick={() => activateAxis(axis)}
            className={[
              'flex-1 py-1 rounded text-xs font-semibold transition-colors',
              activeAxis === axis
                ? 'bg-accent text-white'
                : 'bg-surface-600 text-surface-300 hover:bg-surface-500 hover:text-white',
            ].join(' ')}
          >
            {axis}
          </button>
        ))}
        {activeAxis && (
          <button
            onClick={() => {
              setActiveAxis(null)
              onSectionChange(null, 0)
            }}
            className="px-2 py-1 rounded text-xs bg-surface-600 text-surface-400 hover:text-white hover:bg-surface-500 transition-colors"
            title="Désactiver la coupe"
          >
            ✕
          </button>
        )}
      </div>

      {/* Position slider */}
      {activeAxis ? (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-surface-400 font-mono">
            <span>{min.toFixed(1)}</span>
            <span className="text-accent font-semibold">{position.toFixed(2)} m</span>
            <span>{max.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={position}
            onChange={handleSlider}
            className="w-full h-1.5 appearance-none bg-surface-600 rounded-full cursor-pointer"
          />
        </div>
      ) : (
        <p className="text-surface-500 text-[10px] text-center">
          Sélectionner un axe pour couper la vue
        </p>
      )}
    </div>
  )
}
