import * as Lucide from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function toIconId(name: string) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

const icons = Object.entries(Lucide.icons)
  .map(([name, component]) => [toIconId(name), component as LucideIcon] as const)
  .sort(([a], [b]) => a.localeCompare(b))

export const iconCatalog = icons.map(([id]) => id)
const iconMap = new Map(icons)

export function resolveIcon(id: string | null | undefined): LucideIcon {
  return (id && iconMap.get(id)) || (iconMap.get('layout-grid') as LucideIcon)
}

export function ToolIcon({ id, size = 18 }: { id: string | null | undefined; size?: number }) {
  const IconComponent = resolveIcon(id)
  return <IconComponent size={size} aria-hidden="true" />
}
