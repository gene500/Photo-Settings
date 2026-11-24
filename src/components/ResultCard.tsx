import { formatAperture, formatShutter } from '../engine/format'
import type { ExposureMode, Suggestion } from '../types'

const MODE_LABEL: Record<ExposureMode, string> = {
  'aperture-priority': 'Aperture priority (A or Av on your dial)',
  'shutter-priority': 'Shutter priority (S or Tv on your dial)',
}

interface ResultCardProps {
  suggestion: Suggestion
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-center">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-display text-3xl">{value}</dd>
    </div>
  )
}

export function ResultCard({ suggestion }: ResultCardProps) {
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Aperture" value={formatAperture(suggestion.aperture)} />
        <Stat label="Shutter" value={formatShutter(suggestion.shutterS)} />
        <Stat label="ISO" value={String(suggestion.iso)} />
      </dl>
      <p className="text-center text-sm text-muted">{MODE_LABEL[suggestion.mode]}</p>
      <p>{suggestion.explanation}</p>
      {suggestion.warnings.length > 0 ? (
        <ul className="grid gap-2 rounded-xl border border-danger p-3 text-sm text-danger">
          {suggestion.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
