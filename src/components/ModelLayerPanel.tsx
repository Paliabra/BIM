import type { IfcModel } from '../types/ifc-schema'
import { ModelRegistry } from '../core/ModelRegistry'

interface ModelLayerPanelProps {
  models: IfcModel[]
  registry: ModelRegistry
  onVisibilityChange: (modelId: string, visible: boolean) => void
  onDisciplineChange: (modelId: string, discipline: string) => void
}

/**
 * Shows loaded models as layers, with toggle visibility and discipline label.
 * Inspired by GIS layer panels (SPEC §1 — "disciplines = couches").
 */
export function ModelLayerPanel({
  models,
  registry,
  onVisibilityChange,
  onDisciplineChange,
}: ModelLayerPanelProps) {
  if (models.length === 0) return null

  return (
    <div className="space-y-1">
      {models.map((model) => (
        <ModelLayerRow
          key={model.modelId}
          model={model}
          disciplines={registry.allDisciplines()}
          onVisibilityChange={onVisibilityChange}
          onDisciplineChange={onDisciplineChange}
        />
      ))}
    </div>
  )
}

function ModelLayerRow({
  model,
  disciplines,
  onVisibilityChange,
  onDisciplineChange,
}: {
  model: IfcModel
  disciplines: string[]
  onVisibilityChange: (modelId: string, visible: boolean) => void
  onDisciplineChange: (modelId: string, discipline: string) => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-600 group">
      {/* Color dot */}
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: model.color }}
      />

      {/* Filename (truncated) */}
      <span
        className="text-surface-200 text-xs truncate flex-1 min-w-0"
        title={model.filename}
      >
        {model.filename}
      </span>

      {/* Discipline badge / selector */}
      <select
        value={model.discipline}
        onChange={(e) => onDisciplineChange(model.modelId, e.target.value)}
        className="text-xs bg-surface-600 border border-surface-500 rounded px-1 py-0.5 text-surface-300 focus:outline-none focus:border-accent shrink-0"
        title="Discipline"
      >
        {disciplines.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Object count */}
      {model.objectCount > 0 && (
        <span className="text-surface-400 text-xs shrink-0 font-mono">
          {model.objectCount.toLocaleString('fr-FR')}
        </span>
      )}

      {/* Visibility toggle */}
      <button
        onClick={() => onVisibilityChange(model.modelId, !model.visible)}
        className="text-surface-400 hover:text-white shrink-0 transition-colors"
        title={model.visible ? 'Masquer' : 'Afficher'}
      >
        {model.visible ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 opacity-40" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
          </svg>
        )}
      </button>
    </div>
  )
}
