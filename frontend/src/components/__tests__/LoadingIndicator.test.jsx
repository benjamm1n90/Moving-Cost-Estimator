import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingIndicator from '../LoadingIndicator'

describe('LoadingIndicator', () => {
  it('renders an accessible loading status', () => {
    render(<LoadingIndicator />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })
})
