import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CompletedMoves from '../CompletedMoves'
import { accuracyStats } from '../../estimates'
import api from '../../api'

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const completed = (id, name, estimated, actual, finalPrice = null) => ({
  id,
  customer_name: name,
  move_date: '2026-06-01',
  square_footage: 1000,
  estimated_hours: String(estimated),
  price: '1000.00',
  breakdown: { crew: 3, weight: 7000, low: 900, high: 1100 },
  special_items: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  notes: [],
  completion: { completed_date: '2026-06-01', actual_hours: String(actual), actual_crew_size: 3, final_price: finalPrice },
})

describe('accuracyStats', () => {
  it('averages the variance between estimated and actual hours', () => {
    const stats = accuracyStats([completed(1, 'A', 4, 5), completed(2, 'B', 5, 5)])
    expect(stats.count).toBe(2)
    expect(stats.avgVariance).toBeCloseTo(0.125)
    expect(stats.withinTen).toBe(0.5)
  })

  it('skips legacy estimates without estimated hours', () => {
    expect(accuracyStats([{ ...completed(1, 'A', 4, 5), estimated_hours: null }])).toBeNull()
  })
})

describe('CompletedMoves page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockImplementation((url) => {
      if (url.startsWith('/api/pricing/options/')) return Promise.resolve({ data: { parking: [], packing: [], special_items: [] } })
      return Promise.resolve({ data: [completed(1, 'Alice', 4, 5, '1300.00'), completed(2, 'Bob', 5, 5)] })
    })
  })

  const renderPage = () => render(<MemoryRouter><CompletedMoves /></MemoryRouter>)

  it('loads completed moves and shows accuracy stats and variance', async () => {
    renderPage()
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/api/estimates/?status=completed')
    expect(screen.getByText('25% over estimate')).toBeInTheDocument()
    expect(screen.getByText('Right on estimate')).toBeInTheDocument()
    expect(screen.getByText('13% over')).toBeInTheDocument()
    expect(screen.getByText('Charged $1,300.00')).toBeInTheDocument()
  })

  it('reopening a move removes it from the completed list', async () => {
    api.delete.mockResolvedValueOnce({ status: 204 })
    renderPage()
    await screen.findByText('Alice')

    fireEvent.click(screen.getAllByRole('button', { name: 'Reopen' })[0])

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/estimates/1/completion/'))
    await waitFor(() => expect(screen.queryByText('Alice')).not.toBeInTheDocument())
  })
})
