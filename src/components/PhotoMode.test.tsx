import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_GEAR } from '../engine/gear'
import * as importer from '../import/importPhotos'
import { addPhotos, countPhotos } from '../storage/photoStore'
import { loadPhotoMode } from '../storage/settingsStore'
import type { PhotoRecord } from '../types'
import { PhotoMode } from './PhotoMode'

vi.mock('../import/importPhotos', async (orig) => ({
  ...(await orig<typeof import('../import/importPhotos')>()),
  importPhotos: vi.fn(),
}))

function rec(n: number): PhotoRecord {
  return {
    camera: 'Canon EOS R50',
    lens: 'SIGMA 18-50mm F2.8 DC DN | C',
    focalMm: 35,
    aperture: 2.8,
    shutterS: 1 / 250,
    iso: 100 + n,
    timestamp: 1_700_000_000_000 + n * 1000,
  }
}

async function wipe() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('settings-suggestor')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

const summary = (over = {}) => ({
  total: 5,
  added: 3,
  duplicates: 1,
  skipped: 1,
  storageFailed: false,
  ...over,
})

function setup(onUseGear = vi.fn()) {
  const user = userEvent.setup()
  const utils = render(<PhotoMode currentGear={DEFAULT_GEAR} onUseGear={onUseGear} />)
  return { user, onUseGear, ...utils }
}

async function turnOn(user: ReturnType<typeof userEvent.setup>) {
  const toggle = await screen.findByRole('checkbox', {
    name: 'Personalize with my photos',
  })
  // The toggle is disabled until the saved choice has loaded.
  await waitFor(() => expect(toggle).toBeEnabled())
  await user.click(toggle)
}

function pickFiles(count = 2) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const files = Array.from(
    { length: count },
    (_, i) => new File(['x'], `p${i}.jpg`, { type: 'image/jpeg' }),
  )
  return { input, files }
}

beforeEach(async () => {
  await wipe()
  vi.mocked(importer.importPhotos).mockReset()
})

describe('PhotoMode', () => {
  it('is off by default: only the toggle shows, no file input', async () => {
    setup()
    expect(
      await screen.findByRole('checkbox', { name: 'Personalize with my photos' }),
    ).not.toBeChecked()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })

  it('says the photos stay on this device and are not uploaded', async () => {
    setup()
    expect(await screen.findByText(/stay on this device/i)).toBeInTheDocument()
    expect(screen.getByText(/not uploaded/i)).toBeInTheDocument()
  })

  it('turning it on shows the import button and remembers the choice after a remount', async () => {
    const { user, unmount } = setup()
    await turnOn(user)
    expect(screen.getByRole('button', { name: /choose photos/i })).toBeInTheDocument()
    await waitFor(async () => expect(await loadPhotoMode()).toBe(true))
    unmount()
    setup()
    expect(
      await screen.findByRole('button', { name: /choose photos/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Personalize with my photos' }),
    ).toBeChecked()
  })

  it('imports chosen files and shows the summary', async () => {
    vi.mocked(importer.importPhotos).mockResolvedValue(summary())
    const { user } = setup()
    await turnOn(user)
    const { input, files } = pickFiles(5)
    await user.upload(input, files)
    expect(
      await screen.findByText('Imported 3, skipped 1, already imported 1'),
    ).toBeInTheDocument()
    expect(vi.mocked(importer.importPhotos).mock.calls[0][0]).toHaveLength(5)
  })

  it('shows progress while importing and disables the toggle and delete button', async () => {
    let finish: (s: ReturnType<typeof summary>) => void = () => {}
    vi.mocked(importer.importPhotos).mockImplementation(
      (_files, onProgress) =>
        new Promise((resolve) => {
          onProgress?.(2, 5)
          finish = resolve
        }),
    )
    const { user } = setup()
    await turnOn(user)
    const { input, files } = pickFiles(5)
    await user.upload(input, files)
    expect(await screen.findByText(/2 of 5/)).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Personalize with my photos' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /delete imported photo data/i }),
    ).toBeDisabled()
    finish(summary())
    expect(await screen.findByText(/Imported 3/)).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Personalize with my photos' }),
    ).toBeEnabled()
  })

  it('shows the storage-failed notice', async () => {
    vi.mocked(importer.importPhotos).mockResolvedValue(
      summary({ storageFailed: true, added: 0 }),
    )
    const { user } = setup()
    await turnOn(user)
    const { input, files } = pickFiles()
    await user.upload(input, files)
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be saved/i)
  })

  it('shows detected gear and only applies it when "Use this gear" is clicked', async () => {
    await addPhotos([rec(1), rec(2), rec(3)])
    const { user, onUseGear } = setup()
    await turnOn(user)
    expect(await screen.findByText(/Canon EOS R50/)).toBeInTheDocument()
    expect(screen.getByText(/we guessed/i)).toBeInTheDocument()
    expect(onUseGear).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Use this gear' }))
    expect(onUseGear).toHaveBeenCalledTimes(1)
    expect(onUseGear.mock.calls[0][0]).toMatchObject({
      bodyName: 'Canon EOS R50',
      lensName: 'SIGMA 18-50mm F2.8 DC DN | C',
    })
  })

  it('turning it off hides the import UI but keeps the photos', async () => {
    await addPhotos([rec(1)])
    const { user } = setup()
    await turnOn(user)
    await screen.findByRole('button', { name: /choose photos/i })
    await user.click(screen.getByRole('checkbox', { name: 'Personalize with my photos' }))
    expect(screen.queryByRole('button', { name: /choose photos/i })).toBeNull()
    expect(await countPhotos()).toBe(1)
  })

  it('delete asks for a second click, then clears photos and the detected gear', async () => {
    await addPhotos([rec(1), rec(2)])
    const { user } = setup()
    await turnOn(user)
    await screen.findByText(/Canon EOS R50/)
    await user.click(screen.getByRole('button', { name: 'Delete imported photo data' }))
    expect(await countPhotos()).toBe(2)
    await user.click(screen.getByRole('button', { name: /yes, delete/i }))
    await waitFor(async () => expect(await countPhotos()).toBe(0))
    expect(screen.queryByRole('button', { name: 'Use this gear' })).toBeNull()
  })

  it('shows how you shoot once photos exist, and removes it when the data is deleted', async () => {
    await addPhotos([rec(1), rec(2)])
    const { user } = setup()
    await turnOn(user)
    expect(await screen.findByText('How you shoot')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete imported photo data' }))
    await user.click(screen.getByRole('button', { name: /yes, delete/i }))
    await waitFor(() => expect(screen.queryByText('How you shoot')).toBeNull())
  })

  it('shows no habits card when there are no photos', async () => {
    const { user } = setup()
    await turnOn(user)
    await screen.findByRole('button', { name: /choose photos/i })
    expect(screen.queryByText('How you shoot')).toBeNull()
  })
})
