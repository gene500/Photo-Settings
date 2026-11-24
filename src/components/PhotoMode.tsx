import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { detectGear, type DetectedGear } from '../engine/detectGear'
import { importPhotos, type ImportSummary } from '../import/importPhotos'
import { clearPhotos, loadPhotos } from '../storage/photoStore'
import { loadPhotoMode, savePhotoMode } from '../storage/settingsStore'
import type { GearProfile, PhotoRecord } from '../types'
import { Card } from './Card'
import { HabitsCard } from './HabitsCard'

interface PhotoModeProps {
  currentGear: GearProfile
  onUseGear: (gear: GearProfile) => void
}

/** Opt-in photo features. Off by default; nothing is read or stored until it is switched on. */
export function PhotoMode({ currentGear, onUseGear }: PhotoModeProps) {
  const toggleId = useId()
  const hintId = useId()
  const [on, setOn] = useState<boolean | null>(null) // null while the saved choice loads
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [detected, setDetected] = useState<DetectedGear | null>(null)
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const alive = useRef(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const importing = progress !== null

  useEffect(() => {
    alive.current = true
    void loadPhotoMode().then((saved) => {
      if (alive.current) setOn(saved)
    })
    return () => {
      alive.current = false
    }
  }, [])

  const refreshDetected = useCallback(async () => {
    const stored = await loadPhotos()
    if (!alive.current) return
    setPhotos(stored)
    setDetected(detectGear(stored))
  }, [])

  useEffect(() => {
    if (on) void refreshDetected()
  }, [on, refreshDetected])

  function toggle(next: boolean) {
    setOn(next)
    setConfirmDelete(false)
    void savePhotoMode(next)
  }

  async function handleFiles(list: FileList | null) {
    const files = list ? Array.from(list) : []
    if (files.length === 0) return
    setSummary(null)
    setProgress({ done: 0, total: files.length })
    try {
      const result = await importPhotos(files, (done, total) => {
        if (alive.current) setProgress({ done, total })
      })
      if (alive.current) setSummary(result)
    } finally {
      if (alive.current) setProgress(null)
    }
    await refreshDetected()
  }

  async function handleDelete() {
    const ok = await clearPhotos()
    if (!alive.current) return
    setConfirmDelete(false)
    setDeleteFailed(!ok)
    if (ok) {
      setDetected(null)
      setPhotos([])
      setSummary(null)
    }
  }

  return (
    <Card title="Personalize">
      <div className="grid gap-4">
        <div className="flex items-start gap-3">
          <input
            id={toggleId}
            aria-describedby={hintId}
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-accent-strong"
            checked={on === true}
            disabled={on === null || importing}
            onChange={(e) => toggle(e.target.checked)}
          />
          <div className="grid gap-1">
            <label htmlFor={toggleId} className="font-medium">
              Personalize with my photos
            </label>
            <span id={hintId} className="text-sm text-muted">
              Reads only the camera settings stored in your photos. Your photos stay on
              this device and are not uploaded.
            </span>
          </div>
        </div>

        {on ? (
          <div className="grid gap-4">
            <div>
              <button
                type="button"
                className="btn-secondary"
                disabled={importing}
                onClick={() => fileInput.current?.click()}
              >
                Choose photos
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                tabIndex={-1}
                aria-label="Photos to import"
                className="sr-only"
                disabled={importing}
                onChange={(e) => {
                  const input = e.currentTarget
                  void handleFiles(input.files).then(() => {
                    input.value = ''
                  })
                }}
              />
            </div>

            {progress ? (
              <p role="status" className="text-sm text-muted">
                Reading {progress.done} of {progress.total}…
              </p>
            ) : null}

            {summary ? (
              <p role="status" className="text-sm">
                {`Imported ${summary.added}, skipped ${summary.skipped}, already imported ${summary.duplicates}`}
              </p>
            ) : null}

            {summary?.storageFailed ? (
              <p role="alert" className="banner-error">
                Your photo settings could not be saved. Your browser may be blocking
                storage or be out of space.
              </p>
            ) : null}

            {detected ? (
              <div className="grid gap-2 rounded-xl border border-border p-4">
                <p className="font-medium">
                  {detected.gear.bodyName} with {detected.gear.lensName}
                </p>
                <p className="text-sm text-muted">
                  Found in {detected.photoCount} photos. We guessed:{' '}
                  {detected.guessed.join(', ')}. You can change these in Your gear.
                </p>
                {detected.gear.bodyName === currentGear.bodyName &&
                detected.gear.lensName === currentGear.lensName ? (
                  <p className="text-sm text-muted">This is already your gear.</p>
                ) : null}
                <div>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={importing}
                    onClick={() => onUseGear(detected.gear)}
                  >
                    Use this gear
                  </button>
                </div>
              </div>
            ) : null}

            <HabitsCard photos={photos} />

            {deleteFailed ? (
              <p role="alert" className="banner-error">
                Could not delete the photo data. Your browser may be blocking storage.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => void handleDelete()}
                  >
                    Yes, delete all imported photo data
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={importing}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete imported photo data
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
