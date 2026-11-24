import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from './App'
import * as store from './storage/gearStore'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App when storage is unavailable', () => {
  it('says the gear will not be saved, and clears the notice once saving works again', async () => {
    const save = vi.spyOn(store, 'saveGear').mockResolvedValue(false)
    render(<App />)
    const iso = await screen.findByLabelText('Highest ISO')
    expect(screen.queryByText(/will not be saved/i)).not.toBeInTheDocument()

    fireEvent.change(iso, { target: { value: '12800' } })
    expect(await screen.findByText(/will not be saved/i)).toBeInTheDocument()

    save.mockResolvedValue(true)
    fireEvent.change(iso, { target: { value: '6400' } })
    await waitFor(() =>
      expect(screen.queryByText(/will not be saved/i)).not.toBeInTheDocument(),
    )
  })
})

describe('App first load', () => {
  it('holds space for the shot and result cards until the gear has loaded', async () => {
    render(<App />)
    expect(screen.getAllByTestId('placeholder')).toHaveLength(2)
    await screen.findByRole('region', { name: 'Suggested settings' })
    expect(screen.queryAllByTestId('placeholder')).toHaveLength(0)
  })
})
