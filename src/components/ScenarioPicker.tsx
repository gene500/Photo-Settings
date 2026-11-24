import { useId, useState } from 'react'
import type { Goal, Light, Scenario, Subject } from '../types'

interface ScenarioPickerProps {
  value: Scenario
  onChange: (scenario: Scenario) => void
  /** The lens's focal range. If the lens changes, remount with a new `key`. */
  focalRange: { min: number; max: number }
}

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'street', label: 'Street' },
  { value: 'action', label: 'Action or sports' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'macro', label: 'Close-up (macro)' },
  { value: 'night-sky', label: 'Night sky' },
]

const LIGHTS: { value: Light; label: string }[] = [
  { value: 'bright-sun', label: 'Bright sun' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'shade', label: 'Open shade' },
  { value: 'indoor', label: 'Indoors' },
  { value: 'night', label: 'Night' },
]

const GOALS: { value: Goal; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'freeze-motion', label: 'Freeze motion' },
  { value: 'blur-background', label: 'Blur the background' },
]

const fieldClass =
  'w-full rounded-xl bg-field px-3 py-2 text-base text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-accent disabled:opacity-60'

export function ScenarioPicker({ value, onChange, focalRange }: ScenarioPickerProps) {
  const baseId = useId()
  const [focalText, setFocalText] = useState(String(value.focalLengthMm))
  const fixedLens = focalRange.min === focalRange.max
  const rangeText = fixedLens
    ? `${focalRange.min}mm`
    : `${focalRange.min}-${focalRange.max}mm`

  const focal = Number(focalText)
  const focalInvalid =
    focalText.trim() === '' ||
    !Number.isFinite(focal) ||
    focal < focalRange.min ||
    focal > focalRange.max

  function handleFocal(text: string) {
    setFocalText(text)
    const n = Number(text)
    if (
      text.trim() !== '' &&
      Number.isFinite(n) &&
      n >= focalRange.min &&
      n <= focalRange.max
    ) {
      onChange({ ...value, focalLengthMm: n })
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1">
        <label htmlFor={`${baseId}-subject`} className="text-sm text-muted">
          Subject
        </label>
        <select
          id={`${baseId}-subject`}
          className={fieldClass}
          value={value.subject}
          onChange={(e) => onChange({ ...value, subject: e.target.value as Subject })}
        >
          {SUBJECTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-light`} className="text-sm text-muted">
          Light
        </label>
        <select
          id={`${baseId}-light`}
          className={fieldClass}
          value={value.light}
          onChange={(e) => onChange({ ...value, light: e.target.value as Light })}
        >
          {LIGHTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-goal`} className="text-sm text-muted">
          Goal
        </label>
        <select
          id={`${baseId}-goal`}
          className={fieldClass}
          value={value.goal}
          onChange={(e) => onChange({ ...value, goal: e.target.value as Goal })}
        >
          {GOALS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-focal`} className="text-sm text-muted">
          Focal length (mm)
        </label>
        <input
          id={`${baseId}-focal`}
          type="number"
          inputMode="decimal"
          step="any"
          className={fieldClass}
          value={fixedLens ? String(focalRange.min) : focalText}
          disabled={fixedLens}
          aria-describedby={`${baseId}-focal-help`}
          onChange={(e) => handleFocal(e.target.value)}
        />
        {focalInvalid && !fixedLens ? (
          <p id={`${baseId}-focal-help`} role="alert" className="text-sm text-danger">
            Your lens covers {rangeText}.
          </p>
        ) : (
          <p id={`${baseId}-focal-help`} className="text-sm text-muted">
            Your lens covers {rangeText}.
          </p>
        )}
      </div>
    </div>
  )
}
