import { useEffect, useState } from 'react'
import { Card } from './components/Card'
import { GearForm } from './components/GearForm'
import { isDefaultGear } from './engine/gear'
import { loadGear, saveGear } from './storage/gearStore'
import type { GearProfile } from './types'

export function App() {
  // null while the saved profile is loading
  const [gear, setGear] = useState<GearProfile | null>(null)

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
