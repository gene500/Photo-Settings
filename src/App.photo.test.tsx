import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { addPhotos } from './storage/photoStore'
import { loadGear } from './storage/gearStore'
import type { PhotoRecord } from './types'

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

beforeEach(wipe)

describe('App with photo mode', () => {
  it('shows only the toggle by default, and the gear stays generic', async () => {
    render(<App />)
    expect(
      await screen.findByRole('checkbox', { name: 'Personalize with my photos' }),
    ).not.toBeChecked()
    expect(screen.queryByRole('button', { name: /choose photos/i })).toBeNull()
    expect(screen.getByText(/generic kit lens/i)).toBeInTheDocument()
  })

  it('"Use this gear" fills the gear form and saves it, and nothing changes before that', async () => {
    await addPhotos([rec(1), rec(2)])
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('checkbox', {
      name: 'Personalize with my photos',
    })
    await waitFor(() => expect(toggle).toBeEnabled())
    await user.click(toggle)
    const use = await screen.findByRole('button', { name: 'Use this gear' })
    expect((await loadGear()).bodyName).not.toBe('Canon EOS R50')
    expect(screen.getByLabelText('Longest focal length (mm)')).toHaveValue(55)

    await user.click(use)
    await waitFor(() =>
      expect(screen.getByLabelText('Longest focal length (mm)')).toHaveValue(50),
    )
    expect(screen.queryByText(/generic kit lens/i)).toBeNull()
    await waitFor(async () => expect((await loadGear()).bodyName).toBe('Canon EOS R50'))
  })

  it('nudges the suggested aperture only after the owner opts in', async () => {
    await addPhotos(Array.from({ length: 25 }, (_, i) => ({ ...rec(i), aperture: 2.8 })))
    const user = userEvent.setup()
    render(<App />)
    const aperture = async () =>
      (await screen.findByText('Aperture', { selector: 'dt' })).nextElementSibling
        ?.textContent
    const before = await aperture()
    expect(screen.queryByText(/moved toward your usual aperture/i)).toBeNull()

    const toggle = await screen.findByRole('checkbox', {
      name: 'Personalize with my photos',
    })
    await waitFor(() => expect(toggle).toBeEnabled())
    await user.click(toggle)
    const nudge = await screen.findByRole('checkbox', {
      name: 'Nudge suggestions toward my usual aperture',
    })
    await waitFor(() => expect(nudge).toBeEnabled())
    expect(await aperture()).toBe(before) // photo mode alone changes nothing

    await user.click(nudge)
    expect(
      await screen.findByText(/moved toward your usual aperture/i),
    ).toBeInTheDocument()
    expect(await aperture()).not.toBe(before)

    await user.click(nudge)
    await waitFor(() =>
      expect(screen.queryByText(/moved toward your usual aperture/i)).toBeNull(),
    )
    expect(await aperture()).toBe(before)
  })
})
