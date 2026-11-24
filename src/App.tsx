import { useEffect, useMemo, useState } from 'react'
import { Card } from './components/Card'
import { GearForm } from './components/GearForm'
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

export function App() {
  // null while the saved profile is loading
  const [gear, setGear] = useState<GearProfile | null>(null)
  const [scenario, setScenario] = useState<Scenario>(INITIAL_SCENARIO)

  // Keep the focal length inside whatever lens the gear describes.
  const activeScenario = useMemo(
    () =>
      gear
        ? { ...scenario, focalLengthMm: clampFocal(gear, scenario.focalLengthMm) }
        : scenario,
    [gear, scenario],
  )
  const suggestion = useMemo(
    () => (gear ? suggest(gear, activeScenario) : null),
    [gear, activeScenario],
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
    void saveGear(next)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 py-8">
      <h1 className="text-3xl">Settings Suggestor</h1>
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
      ) : null}
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
            <GearForm value={gear} onChange={handleGearChange} />
          </div>
        )}
      </Card>
    </main>
  )
}
