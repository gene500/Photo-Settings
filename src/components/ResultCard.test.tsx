import { render, screen } from '@testing-library/react'
import type { Suggestion } from '../types'
import { ResultCard } from './ResultCard'

const suggestion: Suggestion = {
  aperture: 8,
  shutterS: 1 / 250,
  iso: 100,
  mode: 'aperture-priority',
  warnings: [],
  explanation:
    'f/8 keeps the scene sharp from foreground to horizon, with 1/250 s for the light.',
}

describe('ResultCard', () => {
  it('formats aperture, shutter and ISO', () => {
    render(<ResultCard suggestion={suggestion} />)
    expect(screen.getByText('Aperture').nextElementSibling).toHaveTextContent('f/8')
    expect(screen.getByText('Shutter').nextElementSibling).toHaveTextContent('1/250 s')
    expect(screen.getByText('ISO').nextElementSibling).toHaveTextContent('100')
  })

  it('announces a changed suggestion to screen readers', () => {
    render(<ResultCard suggestion={suggestion} />)
    expect(
      screen.getByText(/keeps the scene sharp/).closest('[aria-live]'),
    ).toHaveAttribute('aria-live', 'polite')
  })

  it('shows the explanation and the camera mode', () => {
    render(<ResultCard suggestion={suggestion} />)
    expect(screen.getByText(/keeps the scene sharp/)).toBeInTheDocument()
    expect(screen.getByText(/Aperture priority/)).toBeInTheDocument()
  })

  it('names shutter priority for shutter-priority suggestions', () => {
    render(<ResultCard suggestion={{ ...suggestion, mode: 'shutter-priority' }} />)
    expect(screen.getByText(/Shutter priority/)).toBeInTheDocument()
  })

  it('shows warnings', () => {
    render(
      <ResultCard
        suggestion={{ ...suggestion, warnings: ['Use a tripod.', 'Very dark scene.'] }}
      />,
    )
    expect(screen.getByText('Use a tripod.')).toBeInTheDocument()
    expect(screen.getByText('Very dark scene.')).toBeInTheDocument()
  })

  it('shows no warning list when there are none', () => {
    render(<ResultCard suggestion={suggestion} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('says when the usual aperture was used, and says nothing otherwise', () => {
    const { rerender } = render(<ResultCard suggestion={suggestion} />)
    expect(screen.queryByText(/usual aperture/i)).toBeNull()
    rerender(<ResultCard suggestion={{ ...suggestion, personalized: true }} />)
    expect(screen.getByText(/moved toward your usual aperture/i)).toBeInTheDocument()
  })
})
