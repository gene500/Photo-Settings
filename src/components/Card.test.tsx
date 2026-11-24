import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders its title and children', () => {
    render(
      <Card title="Your gear">
        <p>Lens details</p>
      </Card>,
    )
    expect(screen.getByRole('heading', { name: 'Your gear' })).toBeInTheDocument()
    expect(screen.getByText('Lens details')).toBeInTheDocument()
  })

  it('renders without a title', () => {
    render(
      <Card>
        <p>Just content</p>
      </Card>,
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Just content')).toBeInTheDocument()
  })
})
