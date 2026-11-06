import { useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { iconCatalog, ToolIcon } from './icons'

export function IconPicker({ value, onChange, label = 'Ícone' }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [search, setSearch] = useState('')
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? iconCatalog.filter(id => id.includes(q.replace(/[\s_]+/g, '-'))) : iconCatalog
  }, [search])

  function start() {
    setDraft(value)
    setSearch('')
    setOpen(true)
  }

  function clear() {
    onChange('')
    setDraft('')
  }

  return <div className="icon-picker">
    <span className="icon-picker-label">{label}</span>
    <div className="icon-picker-current">
      <span className="tool-icon tone-sand"><ToolIcon id={value} size={19}/></span>
      <span className="icon-picker-id">{value || 'Nenhum ícone selecionado'}</span>
      <button type="button" className="button button-secondary" onClick={start}>{value ? 'Substituir' : 'Selecionar ícone'}</button>
      {value && <button type="button" className="icon-clear" aria-label="Limpar ícone" onClick={clear}><X size={16}/></button>}
    </div>
    <input type="hidden" name="icon" value={value}/>
    {open && <div className="icon-picker-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="icon-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="icon-picker-title" onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>
        <header className="icon-picker-header"><div><h2 id="icon-picker-title">Selecionar ícone</h2><p>{iconCatalog.length.toLocaleString('pt-BR')} ícones Lucide disponíveis</p></div><button type="button" className="icon-clear" aria-label="Fechar seletor" onClick={() => setOpen(false)}><X size={19}/></button></header>
        <label className="icon-picker-search"><Search size={17}/><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar por nome..." aria-label="Pesquisar ícones"/><kbd>ESC</kbd></label>
        <div className="icon-picker-preview"><span className="tool-icon tone-sand"><ToolIcon id={draft} size={22}/></span><div><strong>Pré-visualização</strong><small>{draft || 'Nenhum ícone selecionado'}</small></div></div>
        <div className="icon-picker-grid" role="listbox" aria-label="Catálogo de ícones">
          {results.map(id => <button key={id} type="button" role="option" aria-selected={draft === id} className={draft === id ? 'icon-choice selected' : 'icon-choice'} title={id} onClick={() => setDraft(id)}><ToolIcon id={id} size={19}/><span>{id}</span>{draft === id && <Check className="icon-choice-check" size={13}/>}</button>)}
          {!results.length && <p className="icon-picker-empty">Nenhum ícone corresponde à pesquisa.</p>}
        </div>
        <footer className="icon-picker-footer"><span>{results.length.toLocaleString('pt-BR')} resultados</span><div><button type="button" className="button button-secondary" onClick={clear}>Limpar seleção</button><button type="button" className="button button-primary" disabled={!draft} onClick={() => { onChange(draft); setOpen(false) }}>Confirmar seleção <Check size={15}/></button></div></footer>
      </section>
    </div>}
  </div>
}
