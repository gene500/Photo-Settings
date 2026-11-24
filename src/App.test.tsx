import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'
import { loadGear } from './storage/gearStore'

async function wipeDb() {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('settings-suggestor')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  await wipeDb()
})

describe('App', () => {
  it('renders the app title', async () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: 'Settings Suggestor' }),
    ).toBeInTheDocument()
    await screen.findByLabelText('Highest ISO')
  })

  it('shows the defaults hint on first run', async () => {
    render(<App />)
    expect(await screen.findByText(/generic kit lens/i)).toBeInTheDocument()
  })

  it('shows a suggestion on first run with defaults and updates it when the scenario changes', async () => {
    render(<App />)
    const region = await screen.findByRole('region', { name: 'Suggested settings' })
    const shutter = () =>
      within(region).getByText('Shutter').nextElementSibling?.textContent
    expect(within(region).getByText('Aperture').nextElementSibling?.textContent).toMatch(
      /^f\/\d/,
    )
    const before = shutter()
    expect(before).toBeTruthy()

    await userEvent.selectOptions(screen.getByLabelText('Light'), 'night')
    await waitFor(() => expect(shutter()).not.toBe(before))
  })

  it('updates the suggestion when the gear changes', async () => {
    render(<App />)
    const region = await screen.findByRole('region', { name: 'Suggested settings' })
    const iso = () => within(region).getByText('ISO').nextElementSibling?.textContent
    await userEvent.selectOptions(screen.getByLabelText('Light'), 'night')
    await waitFor(() => expect(iso()).toBe('6400'))
    fireEvent.change(screen.getByLabelText('Highest ISO'), { target: { value: '1600' } })
    await waitFor(() => expect(iso()).toBe('1600'))
  })

  it('keeps edited gear after remount and drops the defaults hint', async () => {
    const first = render(<App />)
    const iso = await screen.findByLabelText('Highest ISO')
    fireEvent.change(iso, { target: { value: '12800' } })
    await waitFor(async () => expect((await loadGear()).isoMax).toBe(12800))
    expect(screen.queryByText(/generic kit lens/i)).not.toBeInTheDocument()
    first.unmount()
    cleanup()

    render(<App />)
    await waitFor(() => expect(screen.getByLabelText('Highest ISO')).toHaveValue(12800))
    expect(screen.queryByText(/generic kit lens/i)).not.toBeInTheDocument()
  })
})
