import { render, screen } from '@testing-library/react'
import type { PhotoRecord } from '../types'
import { HabitsCard } from './HabitsCard'

function photo(over: Partial<PhotoRecord>, n: number): PhotoRecord {
  return {
    camera: 'Canon EOS R50',
    lens: 'L',
    focalMm: 35,
    aperture: 2.8,
    shutterS: 1 / 250,
    iso: 400,
    timestamp: new Date(2026, 2, 14, 10, n).getTime(),
    ...over,
  }
}

describe('HabitsCard', () => {
  it('renders nothing for no photos', () => {
    const { container } = render(<HabitsCard photos={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('says what the favourites are in words', () => {
    render(
      <HabitsCard
        photos={[photo({}, 1), photo({}, 2), photo({ aperture: 5.6, iso: 3200 }, 3)]}
      />,
    )
    expect(screen.getByText(/most used aperture/i)).toHaveTextContent('f/2.8')
    expect(screen.getByText(/most used ISO/i)).toHaveTextContent('400')
    expect(screen.getByText(/most used shutter/i)).toHaveTextContent('1/250 s')
    expect(screen.getByText(/most used focal length/i)).toHaveTextContent('35 mm')
  })

  it('shows each aperture with its count as text, not only as a bar', () => {
    render(
      <HabitsCard photos={[photo({}, 1), photo({}, 2), photo({ aperture: 5.6 }, 3)]} />,
    )
    const list = screen.getByRole('list', { name: /apertures/i })
    expect(list).toHaveTextContent('f/2.8')
    expect(list).toHaveTextContent('2 photos')
    expect(list).toHaveTextContent('1 photo')
  })

  it('states the high-ISO and slow-shutter shares in words', () => {
    render(
      <HabitsCard photos={[photo({ iso: 6400 }, 1), photo({ shutterS: 1 / 15 }, 2)]} />,
    )
    expect(
      screen.getByText(/50% of your photos are at ISO 3200 or higher/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/50% use a shutter slower than 1\/60 s/i)).toBeInTheDocument()
  })

  it('shows busiest time of day', () => {
    render(<HabitsCard photos={[photo({}, 1), photo({}, 2)]} />)
    expect(screen.getByText(/most photos are taken around 10:00/i)).toBeInTheDocument()
  })
})
