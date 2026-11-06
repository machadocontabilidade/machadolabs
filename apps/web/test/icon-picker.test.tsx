import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconPicker } from '../src/IconPicker'
import { iconCatalog, resolveIcon } from '../src/icons'

describe('Lucide icon picker', () => {
  afterEach(cleanup)
  it('exposes the installed catalog, previews and confirms a canonical identifier', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    expect(iconCatalog.length).toBeGreaterThan(2000)
    expect(iconCatalog).toContain('file-spreadsheet')
    expect(resolveIcon('not-a-real-lucide-icon')).toBe(resolveIcon('layout-grid'))
    render(<IconPicker value="calculator" onChange={onChange}/>)
    await user.click(screen.getByRole('button', { name: 'Substituir' }))
    const search = screen.getByRole('textbox', { name: 'Pesquisar ícones' })
    await user.type(search, 'file spreadsheet')
    await user.click(screen.getByRole('option', { name: 'file-spreadsheet' }))
    expect(screen.getAllByText('file-spreadsheet')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /Confirmar seleção/ }))
    expect(onChange).toHaveBeenCalledWith('file-spreadsheet')
  })

  it('can clear an existing selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IconPicker value="bot" onChange={onChange}/> )
    await user.click(screen.getByRole('button', { name: 'Limpar ícone' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
