import type { HotspotId } from '../types/content'
import { hotspotMeta, hotspotOrder } from '../experience/hotspots'

type Props = { onSelect: (id: HotspotId) => void }

export function MobileDock({ onSelect }: Props) {
  return (
    <nav className="object-dock" aria-label="Workbench objects">
      {hotspotOrder.map((id) => (
        <button key={id} type="button" onClick={() => onSelect(id)}>
          <span>{hotspotMeta[id].index}</span>
          {hotspotMeta[id].shortLabel}
        </button>
      ))}
    </nav>
  )
}
