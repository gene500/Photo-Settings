import { useId, useState } from 'react'
import { validateGear } from '../engine/gear'
import type { GearProfile } from '../types'

interface GearFormProps {
  value: GearProfile
  onChange: (gear: GearProfile) => void
}

type NumberKey =
  | 'focalMinMm'
  | 'focalMaxMm'
  | 'apertureMaxWide'
  | 'apertureMaxTele'
  | 'apertureMin'
  | 'isoMin'
  | 'isoMax'
  | 'shutterFastest'
  | 'shutterSlowestS'

interface NumberField {
  key: NumberKey
  label: string
  hint?: string
}

const NUMBER_FIELDS: NumberField[] = [
  { key: 'focalMinMm', label: 'Shortest focal length (mm)' },
  { key: 'focalMaxMm', label: 'Longest focal length (mm)' },
  {
    key: 'apertureMaxWide',
    label: 'Widest aperture at the short end (f/)',
    hint: 'e.g. 3.5',
  },
  {
    key: 'apertureMaxTele',
    label: 'Widest aperture at the long end (f/)',
    hint: 'e.g. 5.6',
  },
  { key: 'apertureMin', label: 'Narrowest aperture (f/)', hint: 'e.g. 22' },
  { key: 'isoMin', label: 'Lowest ISO' },
  { key: 'isoMax', label: 'Highest ISO' },
  { key: 'shutterFastest', label: 'Fastest shutter (1/x second)', hint: 'e.g. 4000' },
  { key: 'shutterSlowestS', label: 'Slowest shutter (seconds)', hint: 'e.g. 30' },
]

type Draft = Record<NumberKey, string> & {
  bodyName: string
  lensName: string
  stabilized: boolean
}

function toDraft(g: GearProfile): Draft {
  return {
    bodyName: g.bodyName,
    lensName: g.lensName,
    stabilized: g.stabilized,
    focalMinMm: String(g.focalMinMm),
    focalMaxMm: String(g.focalMaxMm),
    apertureMaxWide: String(g.apertureMaxWide),
    apertureMaxTele: String(g.apertureMaxTele),
    apertureMin: String(g.apertureMin),
    isoMin: String(g.isoMin),
    isoMax: String(g.isoMax),
    shutterFastest: String(Number((1 / g.shutterFastestS).toPrecision(6))),
    shutterSlowestS: String(g.shutterSlowestS),
  }
}

function num(s: string): number {
  return s.trim() === '' ? Number.NaN : Number(s)
}

/** A short, plain-language reason the draft is not a usable gear profile. */
function problemWith(d: Draft): string | null {
  for (const f of NUMBER_FIELDS) {
    const n = num(d[f.key])
    if (!Number.isFinite(n) || n <= 0) {
      return `Enter a number above zero for "${f.label}".`
    }
  }
  if (num(d.focalMinMm) > num(d.focalMaxMm)) {
    return 'The shortest focal length cannot be longer than the longest.'
  }
  if (num(d.isoMin) > num(d.isoMax)) {
    return 'The lowest ISO cannot be higher than the highest ISO.'
  }
  if (num(d.apertureMin) < Math.max(num(d.apertureMaxWide), num(d.apertureMaxTele))) {
    return 'The narrowest aperture needs a bigger f-number than the widest aperture.'
  }
  if (1 / num(d.shutterFastest) > num(d.shutterSlowestS)) {
    return 'The fastest shutter cannot be slower than the slowest shutter.'
  }
  return null
}

/**
 * Edits a gear profile. Keeps its own text while typing and only calls onChange with a
 * valid profile. If the parent replaces `value` from outside, remount it with a new `key`.
 */
export function GearForm({ value, onChange }: GearFormProps) {
  const baseId = useId()
  const [draft, setDraft] = useState<Draft>(() => toDraft(value))
  const [fastestEdited, setFastestEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(next: Draft, fastestTouched: boolean) {
    setDraft(next)
    const problem = problemWith(next)
    if (problem) {
      setError(problem)
      return
    }
    const candidate = {
      id: value.id,
      bodyName: next.bodyName,
      lensName: next.lensName,
      stabilized: next.stabilized,
      focalMinMm: num(next.focalMinMm),
      focalMaxMm: num(next.focalMaxMm),
      apertureMaxWide: num(next.apertureMaxWide),
      apertureMaxTele: num(next.apertureMaxTele),
      apertureMin: num(next.apertureMin),
      isoMin: num(next.isoMin),
      isoMax: num(next.isoMax),
      // Keep the original value unless the user touched this field, so rounding in the
      // display never changes a stored shutter speed.
      shutterFastestS: fastestTouched
        ? 1 / num(next.shutterFastest)
        : value.shutterFastestS,
      shutterSlowestS: num(next.shutterSlowestS),
    }
    const valid = validateGear(candidate)
    if (!valid) {
      setError('Those gear settings do not fit together.')
      return
    }
    setError(null)
    onChange(valid)
  }

  const fieldClass =
    'w-full rounded-xl bg-field px-3 py-2 text-base text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent'

  return (
    <form className="grid gap-4" onSubmit={(e) => e.preventDefault()} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1">
          <label htmlFor={`${baseId}-body`} className="text-sm text-muted">
            Camera body
          </label>
          <input
            id={`${baseId}-body`}
            type="text"
            className={fieldClass}
            value={draft.bodyName}
            onChange={(e) =>
              update({ ...draft, bodyName: e.target.value }, fastestEdited)
            }
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor={`${baseId}-lens`} className="text-sm text-muted">
            Lens name
          </label>
          <input
            id={`${baseId}-lens`}
            type="text"
            className={fieldClass}
            value={draft.lensName}
            onChange={(e) =>
              update({ ...draft, lensName: e.target.value }, fastestEdited)
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBER_FIELDS.map((f) => (
          <div key={f.key} className="grid gap-1">
            <label htmlFor={`${baseId}-${f.key}`} className="text-sm text-muted">
              {f.label}
            </label>
            <input
              id={`${baseId}-${f.key}`}
              type="number"
              inputMode="decimal"
              step="any"
              placeholder={f.hint}
              className={fieldClass}
              value={draft[f.key]}
              onChange={(e) => {
                const touched = f.key === 'shutterFastest' ? true : fastestEdited
                if (f.key === 'shutterFastest') setFastestEdited(true)
                update({ ...draft, [f.key]: e.target.value }, touched)
              }}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-base">
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={draft.stabilized}
          onChange={(e) =>
            update({ ...draft, stabilized: e.target.checked }, fastestEdited)
          }
        />
        Image stabilization
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  )
}
