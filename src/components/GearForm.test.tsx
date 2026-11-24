import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_GEAR } from '../engine/gear'
import { GearForm } from './GearForm'

describe('GearForm', () => {
  it('shows the current values', () => {
    render(<GearForm value={DEFAULT_GEAR} onChange={() => {}} />)
    expect(screen.getByLabelText('Lens name')).toHaveValue(DEFAULT_GEAR.lensName)
    expect(screen.getByLabelText('Highest ISO')).toHaveValue(6400)
    expect(screen.getByLabelText('Shortest focal length (mm)')).toHaveValue(18)
    expect(screen.getByLabelText('Image stabilization')).toBeChecked()
  })

  it('calls onChange with a valid edited profile', async () => {
    const onChange = vi.fn()
    render(<GearForm value={DEFAULT_GEAR} onChange={onChange} />)
    const iso = screen.getByLabelText('Highest ISO')
    await userEvent.clear(iso)
    await userEvent.type(iso, '12800')
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEAR, isoMax: 12800 })
  })

  it('shows an error and does not call onChange when shortest focal exceeds longest', async () => {
    const onChange = vi.fn()
    render(<GearForm value={DEFAULT_GEAR} onChange={onChange} />)
    const min = screen.getByLabelText('Shortest focal length (mm)')
    // One change event, so no valid in-between value (2, 20) is ever entered.
    fireEvent.change(min, { target: { value: '200' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/shortest focal length/i)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not call onChange for an empty number field', async () => {
    const onChange = vi.fn()
    render(<GearForm value={DEFAULT_GEAR} onChange={onChange} />)
    await userEvent.clear(screen.getByLabelText('Highest ISO'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('toggles stabilization', async () => {
    const onChange = vi.fn()
    render(<GearForm value={DEFAULT_GEAR} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Image stabilization'))
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_GEAR, stabilized: false })
  })

  it('gives every input an accessible label', () => {
    render(<GearForm value={DEFAULT_GEAR} onChange={() => {}} />)
    const inputs = screen
      .getAllByRole('textbox')
      .concat(screen.getAllByRole('spinbutton'))
    expect(inputs.length).toBeGreaterThanOrEqual(10)
    for (const input of inputs) {
      expect(input).toHaveAccessibleName()
    }
  })
})
