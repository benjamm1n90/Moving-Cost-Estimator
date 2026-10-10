import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Estimate from '../Estimate'
import api from '../../api'

vi.mock('../../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const OPTIONS = {
  parking: [
    { value: 'driveway', label: 'Driveway / at the door' },
    { value: 'street', label: 'Street parking' },
  ],
  packing: [
    { value: 'none', label: 'No packing' },
    { value: 'full', label: 'Full packing' },
  ],
  special_items: [{ value: 'upright_piano', label: 'Upright piano', fee: 150, minutes: 30 }],
}

const BREAKDOWN = {
  weight: 7000,
  weight_source: '1000 sq ft x 7 lbs/sq ft',
  crew: 3,
  crew_source: 'recommended for weight',
  hours: [
    { label: 'Loading', hours: 2.33, detail: 'standard access' },
    { label: 'Unloading', hours: 1.87, detail: 'standard access' },
  ],
  total_hours: 4.7,
  billable_hours: 4.75,
  minimum_applied: false,
  hourly_rate: 250,
  costs: [{ label: 'Labor', amount: 1187.5 }, { label: 'Trip fee', amount: 100 }],
  total: 1287.5,
  low: 1158.75,
  high: 1416.25,
}

const baseEstimate = {
  id: 1,
  customer_name: 'Jane Doe',
  move_date: '2026-11-01',
  square_footage: 1000,
  pound_estimate: null,
  crew_size: null,
  packing: 'none',
  origin_stairs: 0,
  origin_elevator: false,
  origin_long_carry_ft: 0,
  origin_parking: 'driveway',
  dest_stairs: 0,
  dest_elevator: false,
  dest_long_carry_ft: 0,
  dest_parking: 'driveway',
  drive_minutes: 0,
  assembly_items: 0,
  special_items: {},
  estimated_hours: '4.75',
  price: '1287.50',
  breakdown: BREAKDOWN,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  notes: [],
  completion: null,
}

function mockGets(estimates) {
  api.get.mockImplementation((url) => {
    if (url.startsWith('/api/pricing/options/')) return Promise.resolve({ data: OPTIONS })
    return Promise.resolve({ data: estimates })
  })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Estimate />
    </MemoryRouter>
  )
}

async function renderWith(estimates) {
  mockGets(estimates)
  renderPage()
  await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
}

describe('Estimate page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches open estimates and pricing options on mount', async () => {
    await renderWith([baseEstimate])
    expect(api.get).toHaveBeenCalledWith('/api/estimates/?status=open')
    expect(api.get).toHaveBeenCalledWith('/api/pricing/options/')
    expect(screen.getByText('$1,287.50')).toBeInTheDocument()
  })

  it('shows a live quote while filling in the form, then saves the estimate', async () => {
    mockGets([])
    api.post.mockImplementation((url, payload) => {
      if (url === '/api/estimates/preview/') return Promise.resolve({ data: BREAKDOWN })
      return Promise.resolve({ data: { ...baseEstimate, id: 2, customer_name: payload.customer_name } })
    })
    renderPage()
    await screen.findByText(/No open estimates/)

    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByLabelText('Square footage'), { target: { value: '1000' } })
    fireEvent.change(screen.getAllByLabelText('Flights of stairs')[0], { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Upright piano'), { target: { value: '1' } })

    expect(await screen.findByTestId('live-quote')).toHaveTextContent('$1,287.50')

    fireEvent.click(screen.getByRole('button', { name: 'Save Estimate' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/estimates/', expect.objectContaining({
      customer_name: 'Bob',
      square_footage: 1000,
      pound_estimate: null,
      crew_size: null,
      origin_stairs: 2,
      dest_stairs: 0,
      special_items: { upright_piano: 1 },
    })))
    expect(await screen.findByText('Bob')).toBeInTheDocument()
    expect(screen.getByLabelText('Customer name')).toHaveValue('')
  })

  it('shows API validation errors inline instead of an alert', async () => {
    mockGets([])
    api.post.mockImplementation((url) => {
      if (url === '/api/estimates/preview/') return Promise.resolve({ data: BREAKDOWN })
      return Promise.reject({ response: { status: 400, data: { square_footage: ['Must be at least 1.'] } } })
    })
    renderPage()
    await screen.findByText(/No open estimates/)

    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByLabelText('Square footage'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Estimate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('square footage: Must be at least 1.')
  })

  it('shows the price breakdown for an estimate', async () => {
    await renderWith([baseEstimate])
    fireEvent.click(screen.getByRole('button', { name: 'Breakdown' }))
    const breakdown = screen.getByTestId('breakdown')
    expect(within(breakdown).getByText('Loading')).toBeInTheDocument()
    expect(within(breakdown).getByText('Trip fee')).toBeInTheDocument()
  })

  it('explains that legacy estimates have no breakdown', async () => {
    await renderWith([{ ...baseEstimate, breakdown: {} }])
    fireEvent.click(screen.getByRole('button', { name: 'Breakdown' }))
    expect(screen.getByText(/old pricing formula/)).toBeInTheDocument()
  })

  it('edits an estimate with the full form and updates the card', async () => {
    await renderWith([baseEstimate])
    api.post.mockResolvedValue({ data: BREAKDOWN })
    api.patch.mockResolvedValueOnce({ data: { ...baseEstimate, customer_name: 'Jane Smith', price: '1500.00' } })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const form = screen.getByRole('form', { name: 'Save Changes' })
    expect(within(form).getByLabelText('Square footage')).toHaveValue(1000)
    fireEvent.change(within(form).getByLabelText('Customer name'), { target: { value: 'Jane Smith' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/estimates/update/1/', expect.objectContaining({ customer_name: 'Jane Smith' })))
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('$1,500.00')).toBeInTheDocument()
  })

  it('marks an estimate completed and moves it off the open list', async () => {
    await renderWith([baseEstimate])
    api.put.mockResolvedValueOnce({
      data: { ...baseEstimate, completion: { completed_date: '2026-11-01', actual_hours: '5.00', actual_crew_size: 3, final_price: null } },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Mark Completed' }))
    const form = screen.getByRole('form', { name: 'Move results' })
    expect(within(form).getByLabelText('Actual crew size')).toHaveValue(3)
    fireEvent.change(within(form).getByLabelText('Actual hours'), { target: { value: '5' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Mark Completed' }))

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/estimates/1/completion/', {
      completed_date: '2026-11-01', actual_hours: '5', actual_crew_size: 3, final_price: null,
    }))
    await waitFor(() => expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument())
  })

  it('asks for confirmation before deleting', async () => {
    await renderWith([baseEstimate])
    api.delete.mockResolvedValueOnce({ status: 204 })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(api.delete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }))

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/estimates/delete/1/'))
    await waitFor(() => expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument())
  })
})

describe('Estimate notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a "Show Notes" toggle that reveals a note form, and hides it again', async () => {
    await renderWith([baseEstimate])

    expect(screen.queryByPlaceholderText('Note title')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show Notes' }))
    expect(screen.getByPlaceholderText('Note title')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide Notes' }))
    expect(screen.queryByPlaceholderText('Note title')).not.toBeInTheDocument()
  })

  it('renders existing notes nested under their estimate', async () => {
    const withNotes = {
      ...baseEstimate,
      notes: [{ id: 5, title: 'Fragile items', content: 'wrap the china', created_at: '2026-01-02T00:00:00Z' }],
    }
    await renderWith([withNotes])

    fireEvent.click(screen.getByRole('button', { name: 'Show Notes' }))
    expect(screen.getByText('Fragile items')).toBeInTheDocument()
    expect(screen.getByText('wrap the china')).toBeInTheDocument()
  })

  it('submits a new note to the estimate-scoped endpoint and shows it', async () => {
    await renderWith([baseEstimate])
    api.post.mockResolvedValueOnce({
      data: { id: 9, title: 'Heavy piano', content: 'needs 2 extra movers', created_at: '2026-01-02T00:00:00Z' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Show Notes' }))
    fireEvent.change(screen.getByPlaceholderText('Note title'), { target: { value: 'Heavy piano' } })
    fireEvent.change(screen.getByPlaceholderText('Note details'), { target: { value: 'needs 2 extra movers' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Note' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/estimates/1/notes/', {
        title: 'Heavy piano',
        content: 'needs 2 extra movers',
      })
    })
    expect(await screen.findByText('Heavy piano')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Note title')).toHaveValue('')
  })

  it('deletes a note via the note-scoped delete endpoint', async () => {
    const withNotes = {
      ...baseEstimate,
      notes: [{ id: 5, title: 'Fragile items', content: 'wrap the china', created_at: '2026-01-02T00:00:00Z' }],
    }
    await renderWith([withNotes])
    api.delete.mockResolvedValueOnce({ status: 204 })

    fireEvent.click(screen.getByRole('button', { name: 'Show Notes' }))
    const noteCard = screen.getByTestId('note-card')
    fireEvent.click(within(noteCard).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/notes/delete/5/'))
    await waitFor(() => expect(screen.queryByText('Fragile items')).not.toBeInTheDocument())
  })
})
