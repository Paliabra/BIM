import { useState, useEffect } from 'react'
import { PREDEFINED_DISCIPLINES } from '../types/ifc-schema'
import { ModelRegistry } from '../core/ModelRegistry'

interface DisciplineModalProps {
  filename: string
  existingCustom: string[]
  onConfirm: (discipline: string) => void
  onCancel: () => void
}

/**
 * Modal shown when the user drops an IFC file.
 * Lets them pick a discipline (predefined or custom) before parsing starts.
 * (SPEC §4 — "Chaque modèle conserve son identité")
 */
export function DisciplineModal({
  filename,
  existingCustom,
  onConfirm,
  onCancel,
}: DisciplineModalProps) {
  const detected = ModelRegistry.detectDiscipline(filename)
  const [selected, setSelected] = useState<string>(detected ?? '')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    if (detected) setSelected(detected)
  }, [detected])

  const handleConfirm = () => {
    const value = (custom.trim() || selected).trim().toUpperCase()
    if (value) onConfirm(value)
  }

  const allDisciplines = [
    ...PREDEFINED_DISCIPLINES,
    ...existingCustom.map((code) => ({ code, label: code })),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-surface-700 border border-surface-500 rounded-xl shadow-2xl p-6 w-[480px] max-w-[95vw]">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-white font-semibold text-base mb-1">
            Discipline du modèle
          </h2>
          <p className="text-surface-400 text-xs font-mono truncate" title={filename}>
            {filename}
          </p>
        </div>

        {/* Predefined chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {allDisciplines.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => { setSelected(code); setCustom('') }}
              title={label}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                selected === code && !custom
                  ? 'bg-accent text-white shadow-md scale-105'
                  : 'bg-surface-600 text-surface-300 hover:bg-surface-500 hover:text-white',
              ].join(' ')}
            >
              {code}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="mb-5">
          <label className="block text-surface-400 text-xs mb-1.5">
            Ou saisir une discipline personnalisée :
          </label>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
            placeholder="ex: FAÇADE, GEO, SYN…"
            className="w-full bg-surface-600 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white placeholder-surface-400 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Preview */}
        {(custom || selected) && (
          <p className="text-surface-400 text-xs mb-4">
            Discipline sélectionnée :{' '}
            <span className="text-accent font-semibold">{custom || selected}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:text-white hover:bg-surface-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!custom.trim() && !selected}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Confirmer →
          </button>
        </div>
      </div>
    </div>
  )
}
