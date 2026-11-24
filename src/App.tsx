import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from './components/Card'
import { GearForm } from './components/GearForm'
import { PhotoMode } from './components/PhotoMode'
import { ResultCard } from './components/ResultCard'
import { ScenarioPicker } from './components/ScenarioPicker'
import { clampFocal, isDefaultGear } from './engine/gear'
import { suggest } from './engine/suggest'
import { loadGear, saveGear } from './storage/gearStore'
import type { GearProfile, Scenario } from './types'

const INITIAL_SCENARIO: Scenario = {
  subject: 'portrait',
  light: 'overcast',
  goal: 'balanced',
  focalLengthMm: 35,
}

/** Holds the place of a card while the saved gear loads, so the page does not jump. */
function Placeholder({ className }: { className: string }) {
  return (
    <div
      data-testid="placeholder"
      aria-hidden="true"
      className={`rounded-2xl bg-surface ring-1 ring-border ${className}`}
    />
  )
}

export function App() {
  // null while the saved profile is loading
  const [gear, setGear] = useState<GearProfile | null>(null)
  const [scenario, setScenario] = useState<Scenario>(INITIAL_SCENARIO)
  const [saveFailed, setSaveFailed] = useState(false)
  // Set by photo mode only when the owner has opted in and has enough photos.
  const [favoriteAperture, setFavoriteAperture] = useState<number | null>(null)
  const saveCount = useRef(0)
  // GearForm only reads its value on mount, so changing it from outside needs a new key.
  const [formKey, setFormKey] = useState(0)

  // Keep the focal length inside whatever lens the gear describes.
  const activeScenario = useMemo(
    () =>
      gear
        ? { ...scenario, focalLengthMm: clampFocal(gear, scenario.focalLengthMm) }
        : scenario,
    [gear, scenario],
  )
  const suggestion = useMemo(
    () =>
      gear
        ? suggest(gear, activeScenario, {
            favoriteAperture: favoriteAperture ?? undefined,
          })
        : null,
    [gear, activeScenario, favoriteAperture],
  )

  useEffect(() => {
    let cancelled = false
    void loadGear().then((g) => {
      if (!cancelled) setGear(g)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function handleGearChange(next: GearProfile) {
    setGear(next)
    const mine = ++saveCount.current
    void saveGear(next).then((saved) => {
      // Ignore a slow earlier save once a newer one has started.
      if (mine === saveCount.current) setSaveFailed(!saved)
    })
  }

  function handleUseGear(next: GearProfile) {
    handleGearChange(next)
    setFormKey((k) => k + 1)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl font-semibold">Settings Suggestor</h1>
      {gear && suggestion ? (
        <>
          <Card title="Your shot">
            <ScenarioPicker
              key={`${gear.focalMinMm}-${gear.focalMaxMm}`}
              value={activeScenario}
              onChange={setScenario}
              focalRange={{ min: gear.focalMinMm, max: gear.focalMaxMm }}
            />
          </Card>
          <Card title="Suggested settings">
            <ResultCard suggestion={suggestion} />
          </Card>
        </>
      ) : (
        <>
          <Placeholder className="h-[27.5rem] sm:h-[16rem]" />
          <Placeholder className="h-[15rem]" />
        </>
      )}
      <Card title="Your gear">
        {gear === null ? (
          <p className="text-muted">Loading your gear…</p>
        ) : (
          <div className="grid gap-4">
            {isDefaultGear(gear) ? (
              <p className="text-sm text-muted">
                Using a generic kit lens (18-55mm f/3.5-5.6). Edit the details below to
                match your camera.
              </p>
            ) : null}
            {saveFailed ? (
              <p role="status" className="text-sm text-danger">
                Your browser is blocking storage, so your gear will not be saved. It will
                reset when you reload.
              </p>
            ) : null}
            <GearForm key={formKey} value={gear} onChange={handleGearChange} />
          </div>
        )}
      </Card>
      {gear ? (
        <PhotoMode
          currentGear={gear}
          onUseGear={handleUseGear}
          onFavoriteApertureChange={setFavoriteAperture}
        />
      ) : null}
    </main>
  )
}
