import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
