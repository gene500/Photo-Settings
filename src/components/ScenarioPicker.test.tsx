import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Scenario } from '../types'
import { ScenarioPicker } from './ScenarioPicker'

const value: Scenario = {
  subject: 'portrait',
  light: 'overcast',
  goal: 'balanced',
  focalLengthMm: 35,
}
const zoom = { min: 18, max: 55 }

function optionCount(label: string) {
  return within(screen.getByLabelText(label)).getAllByRole('option').length
}

describe('ScenarioPicker', () => {
  it('lists every subject, light and goal', () => {
    render(<ScenarioPicker value={value} onChange={() => {}} focalRange={zoom} />)
    expect(optionCount('Subject')).toBe(7)
    expect(optionCount('Light')).toBe(5)
    expect(optionCount('Goal')).toBe(3)
    expect(screen.getByRole('option', { name: 'Night sky' })).toBeInTheDocument()
  })

  it('shows the current choices', () => {
    render(<ScenarioPicker value={value} onChange={() => {}} focalRange={zoom} />)
    expect(screen.getByLabelText('Subject')).toHaveValue('portrait')
    expect(screen.getByLabelText('Light')).toHaveValue('overcast')
    expect(screen.getByLabelText('Goal')).toHaveValue('balanced')
    expect(screen.getByLabelText('Focal length (mm)')).toHaveValue(35)
  })

  it('calls onChange when a choice changes', async () => {
    const onChange = vi.fn()
    render(<ScenarioPicker value={value} onChange={onChange} focalRange={zoom} />)
    await userEvent.selectOptions(screen.getByLabelText('Subject'), 'action')
    expect(onChange).toHaveBeenLastCalledWith({ ...value, subject: 'action' })
    await userEvent.selectOptions(screen.getByLabelText('Light'), 'night')
    expect(onChange).toHaveBeenLastCalledWith({ ...value, light: 'night' })
    await userEvent.selectOptions(screen.getByLabelText('Goal'), 'blur-background')
    expect(onChange).toHaveBeenLastCalledWith({ ...value, goal: 'blur-background' })
  })

  it('calls onChange with a focal length inside the lens range', () => {
    const onChange = vi.fn()
    render(<ScenarioPicker value={value} onChange={onChange} focalRange={zoom} />)
    fireEvent.change(screen.getByLabelText('Focal length (mm)'), {
      target: { value: '50' },
    })
    expect(onChange).toHaveBeenLastCalledWith({ ...value, focalLengthMm: 50 })
  })

  it('does not call onChange for a focal length outside the lens range, and says why', () => {
    const onChange = vi.fn()
    render(<ScenarioPicker value={value} onChange={onChange} focalRange={zoom} />)
    fireEvent.change(screen.getByLabelText('Focal length (mm)'), {
      target: { value: '300' },
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('18-55mm')
  })

  it('does not call onChange for an empty focal length', () => {
    const onChange = vi.fn()
    render(<ScenarioPicker value={value} onChange={onChange} focalRange={zoom} />)
    fireEvent.change(screen.getByLabelText('Focal length (mm)'), {
      target: { value: '' },
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('locks the focal length for a prime lens', () => {
    render(
      <ScenarioPicker
        value={{ ...value, focalLengthMm: 50 }}
        onChange={() => {}}
        focalRange={{ min: 50, max: 50 }}
      />,
    )
    const focal = screen.getByLabelText('Focal length (mm)')
    expect(focal).toBeDisabled()
    expect(focal).toHaveValue(50)
  })
})
