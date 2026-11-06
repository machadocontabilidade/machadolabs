import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

const tool = { id: '11111111-1111-4111-8111-111111111111', name: 'Calculadora fiscal', description: 'Cálculos de apoio', category: 'Fiscal', status: 'available', icon: 'calculator', route: '/calculadora-fiscal' }

function jsonResponse(data: unknown) {
  return { status: 200, ok: true, headers: new Headers(), json: async () => data } as Response
}

describe('Dashboard search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/auth/csrf')) return jsonResponse({ csrfToken: 'csrf-test' })
      if (path.endsWith('/auth/session')) return jsonResponse({ user: { id: '22222222-2222-4222-8222-222222222222', name: 'Teste Usuário', email: 'teste@example.test', role: 'USER' }, rotateAfterMinutes: 25 })
      if (path.endsWith('/tools')) return jsonResponse({ tools: [tool] })
      if (path.endsWith(`/tools/${tool.id}`)) return jsonResponse({ tool })
      throw new Error(`Unexpected request: ${path}`)
    }))
  })

  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  async function dashboard() {
    render(<App />)
    await screen.findByText('Seu trabalho, mais simples.')
    return screen.getByRole('textbox', { name: 'Pesquisar ferramentas' })
  }

  it('keeps focus and route stable for single letters, words, fast typing, clearing and no matches', async () => {
    const user = userEvent.setup()
    const input = await dashboard()
    await user.type(input, 'c')
    expect((input as HTMLInputElement).value).toBe('c')
    expect(document.activeElement).toBe(input)
    expect(window.location.pathname).toBe('/')
    await user.clear(input)
    await user.type(input, 'calculadora fiscal')
    expect(screen.getByRole('option', { name: /Calculadora fiscal/ })).toBeTruthy()
    expect(document.activeElement).toBe(input)
    expect(window.location.pathname).toBe('/')
    await user.clear(input)
    await user.type(input, 'zzzz')
    expect(screen.getByText(/Nenhuma ferramenta encontrada/)).toBeTruthy()
    expect(document.activeElement).toBe(input)
    expect(window.location.pathname).toBe('/')
    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa' }))
    expect((input as HTMLInputElement).value).toBe('')
    expect(window.location.pathname).toBe('/')
  })

  it('opens a result on mouse selection and only opens on Enter after a result is selected', async () => {
    const user = userEvent.setup()
    const input = await dashboard()
    await user.type(input, 'calculadora')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Seu trabalho, mais simples.')).toBeTruthy()
    await user.keyboard('{ArrowDown}{Enter}')
    await screen.findByRole('button', { name: /Voltar ao catálogo/ })
    expect(window.location.pathname).toBe('/')
  })

  it.each(['Control', 'Meta'])('Ctrl/Command + K focuses the search without navigating (%s)', async modifier => {
    const input = await dashboard()
    fireEvent.change(input, { target: { value: 'calc' } })
    fireEvent.keyDown(window, { key: 'k', [modifier === 'Control' ? 'ctrlKey' : 'metaKey']: true })
    await waitFor(() => expect(document.activeElement).toBe(input))
    expect((input as HTMLInputElement).value).toBe('calc')
    expect((input as HTMLInputElement).selectionStart).toBe(0)
    expect((input as HTMLInputElement).selectionEnd).toBe(4)
    expect(window.location.pathname).toBe('/')
  })

  it('opens the matching tool when a result is clicked', async () => {
    const user = userEvent.setup()
    const input = await dashboard()
    await user.type(input, 'fiscal')
    await user.click(screen.getByRole('option', { name: /Calculadora fiscal/ }))
    await screen.findByRole('button', { name: /Voltar ao catálogo/ })
    expect(screen.getByRole('heading', { name: 'Calculadora fiscal' })).toBeTruthy()
    expect(window.location.pathname).toBe('/')
  })
})
