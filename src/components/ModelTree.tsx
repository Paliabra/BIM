import { useState } from 'react'
import type { IfcSpatialTree, IfcTreeNode } from '../types/ifc-schema'

interface ModelTreeProps {
  trees: IfcSpatialTree[]
}

/**
 * Hierarchical model tree — Site → Building → Storey → Space (SPEC §9).
 * One tree per loaded IFC model.
 */
export function ModelTree({ trees }: ModelTreeProps) {
  if (trees.length === 0) {
    return (
      <div className="text-surface-400 text-xs px-3 py-4 text-center">
        Aucun modèle chargé
      </div>
    )
  }

  return (
    <div className="text-sm overflow-auto">
      {trees.map((tree) => (
        <div key={tree.modelId} className="mb-2">
          {tree.project ? (
            <TreeNode node={tree.project} depth={0} />
          ) : (
            tree.sites.map((site) => (
              <TreeNode key={site.expressId} node={site} depth={0} />
            ))
          )}
        </div>
      ))}
    </div>
  )
}

const IFC_TYPE_ICONS: Record<string, string> = {
  IfcProject:        '📋',
  IfcSite:           '🌍',
  IfcBuilding:       '🏢',
  IfcBuildingStorey: '🏠',
  IfcSpace:          '📦',
}

function TreeNode({ node, depth }: { node: IfcTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const icon = IFC_TYPE_ICONS[node.ifcType] ?? '◆'

  const label =
    node.name ||
    (node.ifcType === 'IfcBuildingStorey' ? `Niveau ${node.expressId}` :
     node.ifcType === 'IfcBuilding' ? 'Bâtiment' :
     node.ifcType === 'IfcSite' ? 'Site' : node.ifcType)

  const elevLabel =
    node.elevation !== undefined ? ` (z = ${node.elevation.toFixed(2)} m)` : ''

  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-surface-600 cursor-pointer group"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {/* Arrow */}
        <span
          className={[
            'text-surface-400 text-xs transition-transform duration-150 w-3 shrink-0',
            hasChildren ? '' : 'invisible',
            open ? 'rotate-90' : '',
          ].join(' ')}
        >
          ▶
        </span>

        {/* Icon */}
        <span className="text-sm">{icon}</span>

        {/* Label */}
        <span className="text-surface-200 text-xs truncate group-hover:text-white">
          {label}
          {elevLabel && (
            <span className="text-surface-400 ml-1">{elevLabel}</span>
          )}
        </span>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.expressId} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
