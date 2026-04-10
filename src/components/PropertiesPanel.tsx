import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { SceneGraph } from '../core/SceneGraph'
import type { IfcPSet, IfcQuantitySet } from '../types/ifc-schema'

interface PropertiesPanelProps {
  expressId: number | null
  modelId: string | null
  graph: SceneGraph
  /** Bumped when PROPERTIES message received — triggers re-read from graph */
  dataVersion: number
  onRequestProperties: (expressId: number, modelId: string) => void
}

/**
 * Displays IFC object identity, PSets and quantities for the selected object.
 * Properties are loaded on demand via GET_PROPERTIES Worker message.
 */
export function PropertiesPanel({
  expressId,
  modelId,
  graph,
  dataVersion,
  onRequestProperties,
}: PropertiesPanelProps) {
  // Re-read from graph when expressId or dataVersion changes
  const obj = useMemo(
    () => (expressId !== null ? graph.get(expressId) : null),
    // dataVersion triggers re-read after PROPERTIES received
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, expressId, dataVersion],
  )

  if (expressId === null || modelId === null || !obj) {
    return (
      <div className="text-surface-400 text-xs px-3 py-4 text-center leading-relaxed">
        Cliquez un objet
        <br />
        pour voir ses propriétés
      </div>
    )
  }

  return (
    <div className="text-xs space-y-2 px-2 py-2">
      {/* Identity */}
      <Section title="Identité">
        <Row label="Type" value={obj.ifcType.replace('Ifc', '')} />
        <Row label="Nom" value={obj.name || '—'} />
        <Row label="ID" value={String(obj.expressId)} mono />
        <Row label="GUID" value={obj.globalId} mono truncate />
      </Section>

      {/* Spatial envelope */}
      <Section title="Enveloppe">
        <Row
          label="Min"
          value={`${obj.bbox.min.x.toFixed(2)}, ${obj.bbox.min.y.toFixed(2)}, ${obj.bbox.min.z.toFixed(2)}`}
          mono
        />
        <Row
          label="Max"
          value={`${obj.bbox.max.x.toFixed(2)}, ${obj.bbox.max.y.toFixed(2)}, ${obj.bbox.max.z.toFixed(2)}`}
          mono
        />
      </Section>

      {/* Properties — loaded on demand */}
      {!obj.properties ? (
        <button
          onClick={() => onRequestProperties(expressId, modelId)}
          className="w-full px-3 py-1.5 rounded text-xs bg-surface-600 hover:bg-surface-500 text-surface-300 hover:text-white transition-colors"
        >
          Charger les propriétés
        </button>
      ) : (
        <>
          {obj.properties.psets.map((pset) => (
            <PSetSection key={pset.name} pset={pset} />
          ))}
          {obj.properties.quantities.map((qs) => (
            <QuantitySection key={qs.name} qs={qs} />
          ))}
          {obj.properties.psets.length === 0 && obj.properties.quantities.length === 0 && (
            <div className="text-surface-400 text-xs text-center py-1">
              Aucune propriété disponible
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-surface-500 font-semibold uppercase tracking-wide text-[10px] mb-1">
        {title}
      </div>
      <div className="bg-surface-700 rounded divide-y divide-surface-600">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  truncate,
}: {
  label: string
  value: string
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <div className="flex items-start gap-2 px-2 py-1">
      <span className="text-surface-500 shrink-0 w-10">{label}</span>
      <span
        className={[
          'text-surface-200 flex-1 min-w-0',
          mono ? 'font-mono' : '',
          truncate ? 'truncate' : 'break-all',
        ].join(' ')}
        title={value}
      >
        {value}
      </span>
    </div>
  )
}

function PSetSection({ pset }: { pset: IfcPSet }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-left transition-colors"
      >
        <span className="text-surface-300 font-medium truncate flex-1">{pset.name}</span>
        <span
          className={[
            'text-surface-500 text-[10px] transition-transform duration-150 ml-1 shrink-0',
            open ? 'rotate-90' : '',
          ].join(' ')}
        >
          ▶
        </span>
      </button>
      {open && (
        <div className="bg-surface-700 rounded-b divide-y divide-surface-600 mt-px">
          {pset.properties.map((p) => (
            <Row
              key={p.name}
              label={p.name.slice(0, 10)}
              value={p.value === null ? '—' : String(p.value)}
              truncate
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QuantitySection({ qs }: { qs: IfcQuantitySet }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-left transition-colors"
      >
        <span className="text-surface-300 font-medium truncate flex-1">{qs.name}</span>
        <span
          className={[
            'text-surface-500 text-[10px] transition-transform duration-150 ml-1 shrink-0',
            open ? 'rotate-90' : '',
          ].join(' ')}
        >
          ▶
        </span>
      </button>
      {open && (
        <div className="bg-surface-700 rounded-b divide-y divide-surface-600 mt-px">
          {qs.quantities.map((q) => (
            <Row
              key={q.name}
              label={q.name.slice(0, 10)}
              value={`${q.value.toFixed(3)} ${q.unit}`}
              mono
            />
          ))}
        </div>
      )}
    </div>
  )
}
