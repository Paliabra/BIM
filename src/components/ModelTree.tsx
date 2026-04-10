import { useState, useCallback } from 'react'
import type { IfcSpatialTree, IfcTreeNode } from '../types/ifc-schema'
import { useBim } from '../context/BimContext'

interface ModelTreeProps {
  trees: IfcSpatialTree[]
}

/**
 * Hierarchical model tree — Site → Building → Storey → Space (SPEC §9).
 * Each node can be expanded/collapsed and toggled visible/hidden.
 * Toggling a storey hides all objects whose expressId is in that subtree.
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
    <div className="text-sm">
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

// ── Icons ────────────────────────────────────────────────────────────────────

const IFC_TYPE_ICONS: Record<string, string> = {
  IfcProject:        '📋',
  IfcSite:           '🌍',
  IfcBuilding:       '🏢',
  IfcBuildingStorey: '🏠',
  IfcSpace:          '📦',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collect all expressIds in a subtree (node itself + all descendants).
 * Used to know which meshes to toggle when a storey node is clicked.
 */
function collectExpressIds(node: IfcTreeNode): Set<number> {
  const ids = new Set<number>()
  const visit = (n: IfcTreeNode) => {
    ids.add(n.expressId)
    for (const child of n.children) visit(child)
  }
  visit(node)
  return ids
}

// ── TreeNode ─────────────────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  parentHidden,
}: {
  node: IfcTreeNode
  depth: number
  parentHidden?: boolean
}) {
  const { getRenderer } = useBim()
  const [open, setOpen]       = useState(depth < 2)
  const [hidden, setHidden]   = useState(false)

  const hasChildren = node.children.length > 0
  const icon        = IFC_TYPE_ICONS[node.ifcType] ?? '◆'
  const isHidden    = hidden || !!parentHidden

  const label =
    node.name ||
    (node.ifcType === 'IfcBuildingStorey' ? `Niveau ${node.expressId}` :
     node.ifcType === 'IfcBuilding'       ? 'Bâtiment' :
     node.ifcType === 'IfcSite'           ? 'Site' : node.ifcType)

  const elevLabel =
    node.elevation !== undefined ? ` (z = ${node.elevation.toFixed(2)} m)` : ''

  const handleToggleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const nextHidden = !hidden
      setHidden(nextHidden)
      // Collect all expressIds in this subtree and toggle them
      const ids = collectExpressIds(node)
      getRenderer()?.setObjectsVisibility(ids, !nextHidden)
    },
    [hidden, node, getRenderer],
  )

  return (
    <div>
      <div
        className={[
          'flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer group',
          isHidden ? 'opacity-40' : 'hover:bg-surface-600',
        ].join(' ')}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {/* Expand arrow */}
        <span
          className={[
            'text-surface-400 text-xs transition-transform duration-150 w-3 shrink-0',
            hasChildren ? '' : 'invisible',
            open ? 'rotate-90' : '',
          ].join(' ')}
        >
          ▶
        </span>

        {/* IFC type icon */}
        <span className="text-sm">{icon}</span>

        {/* Label */}
        <span className="text-surface-200 text-xs truncate flex-1 min-w-0 group-hover:text-white">
          {label}
          {elevLabel && (
            <span className="text-surface-400 ml-1 text-[10px]">{elevLabel}</span>
          )}
        </span>

        {/* Visibility toggle — shown on hover */}
        <button
          onClick={handleToggleVisibility}
          className={[
            'shrink-0 transition-colors ml-1',
            'opacity-0 group-hover:opacity-100',
            isHidden ? 'text-surface-500' : 'text-surface-400 hover:text-white',
          ].join(' ')}
          title={isHidden ? 'Afficher' : 'Masquer'}
        >
          {isHidden ? (
            <svg className="w-3 h-3 opacity-40" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                clipRule="evenodd"
              />
              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.expressId}
              node={child}
              depth={depth + 1}
              parentHidden={isHidden}
            />
          ))}
        </div>
      )}
    </div>
  )
}
