import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthForm from '../AuthForm'
import api from '../../api'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../../constants'

vi.mock('../../api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('AuthForm', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders username/password inputs and a submit button labeled for the given method', () => {
    render(
      <MemoryRouter>
        <AuthForm route="/api/token/" method="login" />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/register')
  })

  it('renders a Register heading/button when method is register', () => {
    render(
      <MemoryRouter>
        <AuthForm route="/api/user/register/" method="register" />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('stores tokens on successful login submit', async () => {
    api.post.mockResolvedValueOnce({ data: { access: 'access-token', refresh: 'refresh-token' } })

    render(
      <MemoryRouter>
        <AuthForm route="/api/token/" method="login" />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'ben' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(localStorage.getItem(ACCESS_TOKEN)).toBe('access-token')
    })
    expect(localStorage.getItem(REFRESH_TOKEN)).toBe('refresh-token')
    expect(api.post).toHaveBeenCalledWith('/api/token/', { username: 'ben', password: 'secret' })
  })

  it('shows an inline error and does not store tokens when the request fails', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 401, data: { detail: 'No active account' } } })

    render(
      <MemoryRouter>
        <AuthForm route="/api/token/" method="login" />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'ben' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.')
    expect(localStorage.getItem(ACCESS_TOKEN)).toBeNull()
  })

  it('shows a server-unreachable message on network errors', async () => {
    api.post.mockRejectedValueOnce(new Error('Network Error'))

    render(
      <MemoryRouter>
        <AuthForm route="/api/token/" method="login" />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'ben' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server")
  })
})
