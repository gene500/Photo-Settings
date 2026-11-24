import { formatAperture, formatShutter } from '../engine/format'
import { summarizeHabits, type Count } from '../engine/habits'
import type { PhotoRecord } from '../types'

const plural = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`
const percent = (share: number) => `${Math.round(share * 100)}%`

function Bars({
  label,
  rows,
}: {
  label: string
  rows: { key: number; text: string; count: number }[]
}) {
  const max = Math.max(...rows.map((r) => r.count))
  return (
    <div className="grid gap-1">
      <h4 className="text-sm font-medium">{label}</h4>
      <ul aria-label={label} className="grid gap-1">
        {rows.map((r) => (
          <li
            key={r.key}
            className="grid grid-cols-[4.5rem_1fr_5rem] items-center gap-2 text-sm"
          >
            <span>{r.text}</span>
            <span aria-hidden="true" className="h-2 rounded-full bg-hover">
              <span
                className="block h-2 rounded-full bg-accent-strong"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </span>
            <span className="text-right text-muted">{plural(r.count)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const rowsOf = (counts: Count[], text: (v: number) => string) =>
  counts.map((c) => ({ key: c.value, text: text(c.value), count: c.count }))

/** How the owner shoots, in words and simple bars. Counts are always shown as text too. */
export function HabitsCard({ photos }: { photos: PhotoRecord[] }) {
  const habits = summarizeHabits(photos)
  if (!habits) return null
  const busiest = habits.hours.indexOf(Math.max(...habits.hours))
  const { favorite } = habits
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">How you shoot</h3>
      <div className="grid gap-1 text-sm">
        <p>Most used aperture: {formatAperture(favorite.aperture)}</p>
        <p>Most used ISO: {favorite.iso}</p>
        <p>Most used shutter: {formatShutter(favorite.shutterS)}</p>
        {favorite.focalMm !== null ? (
          <p>Most used focal length: {favorite.focalMm} mm</p>
        ) : null}
        <p>{percent(habits.highIsoShare)} of your photos are at ISO 3200 or higher.</p>
        <p>{percent(habits.slowShutterShare)} use a shutter slower than 1/60 s.</p>
        <p>Most photos are taken around {String(busiest).padStart(2, '0')}:00.</p>
      </div>
      <Bars label="Apertures" rows={rowsOf(habits.apertures, formatAperture)} />
      <Bars label="ISO" rows={rowsOf(habits.isos, (v) => String(v))} />
    </div>
  )
}
