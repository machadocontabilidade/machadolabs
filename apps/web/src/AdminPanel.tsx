import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type Role = 'OWNER' | 'ADMIN' | 'USER'
type ToolStatus = 'available' | 'development' | 'maintenance' | 'unavailable'
type AdminUser = { id: string; name: string; email: string; role: Role; status: 'active' | 'disabled' }
type Tool = { id: string; name: string; description: string; icon: string; category: string; route: string; status: ToolStatus; responsible_id: string | null }
type Category = { name: string }
type Dashboard = { users: { total: number; active: number }; tools: { total: number; available: number; development: number; maintenance: number; unavailable: number }; activity: { id: number; action: string; at: string; resource: string | null; resource_id: string | null; actor: string | null }[] }
const API = import.meta.env.VITE_API_URL || '/api'
async function request<T>(path: string, csrf: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (options.method && options.method !== 'GET') headers.set('X-CSRF-Token', csrf)
  const response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'include' })
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'request_failed')
  return body as T
}
const labels: Record<string, string> = { user_created: 'Usuário criado', user_updated: 'Usuário editado', user_role_changed: 'Perfil alterado', user_status_changed: 'Status de usuário alterado', tool_created: 'Ferramenta cadastrada', tool_updated: 'Ferramenta editada', tool_permissions_changed: 'Permissões alteradas', category_created: 'Categoria criada', category_updated: 'Categoria editada', category_deleted: 'Categoria removida' }
function message(e: unknown) { const code = e instanceof Error ? e.message : ''; return ({ category_in_use: 'A categoria ainda está vinculada a ferramentas.', category_unavailable: 'Já existe uma categoria com esse nome.', email_unavailable: 'Este e-mail já está cadastrado.', route_unavailable: 'Esta rota já está cadastrada.', forbidden: 'Seu perfil não pode executar esta ação.' } as Record<string, string>)[code] || 'Não foi possível concluir a operação.' }

export function AdminPanel({ csrf, role }: { csrf: string; role: Role }) {
  const owner = role === 'OWNER'
  const [section, setSection] = useState<'Dashboard' | 'Usuários' | 'Ferramentas' | 'Categorias'>('Dashboard')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Tool | null>(null)
  const [searchBusy, setSearchBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    setSearchBusy(true); setError('')
    try {
      const [d, u, t, c] = await Promise.all([
        request<Dashboard>('/dashboard/admin', csrf),
        request<{ users: AdminUser[] }>(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`, csrf),
        request<{ tools: Tool[] }>('/tools', csrf),
        request<{ categories: Category[] }>('/categories', csrf)
      ])
      setDashboard(d); setUsers(u.users); setTools(t.tools); setCategories(c.categories)
    } catch (e) { setError(message(e)) } finally { setSearchBusy(false) }
  }, [csrf, query])
  useEffect(() => { void load() }, [load])
  async function submit(event: FormEvent<HTMLFormElement>, action: () => Promise<unknown>, success: string): Promise<boolean> {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await action(); setNotice(success); await load(); return true } catch (e) { setError(message(e)); return false } finally { setBusy(false) }
  }
  async function updateUser(user: AdminUser, form: HTMLFormElement) {
    const data = new FormData(form)
    const patch = { name: data.get('name'), email: data.get('email'), ...(owner ? { role: data.get('role') } : {}) }
    await request(`/users/${user.id}`, csrf, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  async function statusUser(user: AdminUser) {
    setBusy(true); setError(''); setNotice('')
    try { await request(`/users/${user.id}/status`, csrf, { method: 'PATCH', body: JSON.stringify({ status: user.status === 'active' ? 'disabled' : 'active' }) }); setNotice('Status da conta atualizado.'); await load() } catch (e) { setError(message(e)) } finally { setBusy(false) }
  }
  const title = section === 'Dashboard' ? 'Painel administrativo' : `Gerenciamento de ${section.toLowerCase()}`
  return <section className="admin-panel">
    <div className="page-heading"><div className="eyebrow">MACHADO LABS / ADMINISTRAÇÃO</div><h1>{title}</h1><p>Controles administrativos da plataforma.</p></div>
    <div className="admin-tabs" role="tablist">{(['Dashboard', 'Usuários', 'Ferramentas', 'Categorias'] as const).map(item => <button key={item} className={section === item ? 'admin-tab active' : 'admin-tab'} onClick={() => { setSection(item); setError(''); setNotice('') }}>{item}</button>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="admin-success" role="status">{notice}</p>}
    {searchBusy && <p className="empty-note" role="status">Carregando dados administrativos…</p>}
    {section === 'Dashboard' && dashboard && <>
      <div className="admin-metrics"><Metric label="TOTAL DE USUÁRIOS" value={dashboard.users.total}/><Metric label="USUÁRIOS ATIVOS" value={dashboard.users.active}/><Metric label="TOTAL DE FERRAMENTAS" value={dashboard.tools.total}/><Metric label="DISPONÍVEIS" value={dashboard.tools.available}/><Metric label="EM DESENVOLVIMENTO" value={dashboard.tools.development}/><Metric label="EM MANUTENÇÃO" value={dashboard.tools.maintenance}/><Metric label="INDISPONÍVEIS" value={dashboard.tools.unavailable}/></div>
      <h2 className="admin-subtitle">Últimas atividades administrativas</h2>
      <div className="admin-list">{dashboard.activity.map(item => <div className="admin-activity" key={item.id}><strong>{labels[item.action] || item.action}</strong><span>{item.resource || 'plataforma'}{item.resource_id ? ` · ${item.resource_id}` : ''}</span><small>{item.actor || 'Conta removida'} · {new Date(item.at).toLocaleString('pt-BR')}</small></div>)}{!dashboard.activity.length && <p className="empty-note">Nenhuma atividade administrativa registrada.</p>}</div>
    </>}
    {section === 'Usuários' && <>
      <form className="admin-search" onSubmit={e => { e.preventDefault(); void load() }}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar por nome ou e-mail"/><button className="button button-secondary">Pesquisar</button></form>
      <form className="admin-create user-create" onSubmit={e => { const form=e.currentTarget; void submit(e,()=>{const d=new FormData(form);return request('/users',csrf,{method:'POST',body:JSON.stringify({name:d.get('name'),email:d.get('email'),password:d.get('password'),role:d.get('role')})})},'Usuário criado.').then(ok=>{if(ok)form.reset()}) }}><h2>Novo usuário</h2><label>Nome<input name="name" required maxLength={120}/></label><label>E-mail<input name="email" type="email" required maxLength={254}/></label><label>Senha inicial<input name="password" type="password" required minLength={12} autoComplete="new-password"/></label><label>Perfil<select name="role"><option value="USER">USER</option>{owner && <option value="ADMIN">ADMIN</option>}</select></label><button className="button button-primary" disabled={busy}>Criar usuário</button></form>
      <div className="admin-user-list">{users.map(user => <form className="admin-user-row" key={user.id} onSubmit={e => { const form=e.currentTarget; void submit(e,()=>updateUser(user,form),'Usuário atualizado.') }}><label>Nome<input name="name" defaultValue={user.name} required maxLength={120}/></label><label>E-mail<input name="email" type="email" defaultValue={user.email} required/></label><label>Perfil<select name="role" defaultValue={user.role} disabled={!owner}><option value="USER">USER</option>{owner && <option value="ADMIN">ADMIN</option>}</select></label><span className={user.status === 'active' ? 'user-status active' : 'user-status'}>{user.status === 'active' ? 'Ativo' : 'Bloqueado'}</span><div className="row-actions"><button className="button button-secondary" disabled={busy}>Salvar</button><button type="button" className="text-link" disabled={busy} onClick={() => void statusUser(user)}>{user.status === 'active' ? 'Bloquear' : 'Ativar'}</button></div></form>)}{!users.length && !searchBusy && <p className="empty-note">Nenhum usuário encontrado.</p>}</div>
    </>}
    {section === 'Ferramentas' && <>
      <form key={editing?.id || 'new-tool'} className="admin-create" onSubmit={e => { const form=e.currentTarget; void submit(e,()=>{const d=new FormData(form); const body={name:d.get('name'),description:d.get('description'),icon:d.get('icon'),category:d.get('category'),route:d.get('route'),status:d.get('status'),responsibleId:d.get('responsibleId')||null}; return request(editing ? `/tools/${editing.id}` : '/tools',csrf,{method:editing?'PUT':'POST',body:JSON.stringify(body)})},editing?'Ferramenta atualizada.':'Ferramenta cadastrada.').then(ok=>{if(ok){setEditing(null);form.reset()}}) }}>
        <h2>{editing ? `Editar ${editing.name}` : 'Cadastrar ferramenta'}</h2><label>Nome<input name="name" required maxLength={120} defaultValue={editing?.name}/></label><label>Categoria<select name="category" required defaultValue={editing?.category || ''}><option value="" disabled>Selecione</option>{categories.map(c=><option key={c.name}>{c.name}</option>)}</select></label><label>Rota<input name="route" required pattern="/[^/].*" placeholder="/ferramenta" defaultValue={editing?.route}/></label><label>Ícone<input name="icon" maxLength={120} defaultValue={editing?.icon || '▤'}/></label><label>Status<select name="status" defaultValue={editing?.status || 'available'}><option value="available">Disponível</option><option value="development">Em desenvolvimento</option><option value="maintenance">Em manutenção</option><option value="unavailable">Indisponível</option></select></label><label>Responsável<select name="responsibleId" defaultValue={editing?.responsible_id || ''}><option value="">Sem responsável</option>{users.filter(u=>u.status==='active').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label className="admin-wide">Descrição<textarea name="description" maxLength={2000} defaultValue={editing?.description}/></label><div className="row-actions"><button className="button button-primary" disabled={busy}>{editing?'Salvar alterações':'Cadastrar ferramenta'}</button>{editing&&<button type="button" className="text-link" onClick={()=>setEditing(null)}>Cancelar</button>}</div>
      </form>
      <div className="admin-tool-list">{tools.map(tool=><div className="admin-tool-row" key={tool.id}><div className="tool-icon">{tool.icon || '▤'}</div><div><strong>{tool.name}</strong><small>{tool.category} · {tool.status} · {tool.route}</small></div><button className="text-link" onClick={()=>{setEditing(tool);window.scrollTo({top:0,behavior:'smooth'})}}>Editar</button></div>)}{!tools.length&&!searchBusy&&<p className="empty-note">Nenhuma ferramenta cadastrada.</p>}</div>
    </>}
    {section === 'Categorias' && <>
      <form className="admin-create category-create" onSubmit={e => { const form=e.currentTarget; void submit(e,()=>request('/categories',csrf,{method:'POST',body:JSON.stringify({name:new FormData(form).get('name')})}),'Categoria criada.').then(ok=>{if(ok)form.reset()}) }}><h2>Nova categoria</h2><label>Nome<input name="name" required maxLength={80}/></label><button className="button button-primary" disabled={busy}>Criar categoria</button></form>
      <div className="admin-category-list">{categories.map(category=><CategoryRow key={category.name} category={category} csrf={csrf} busy={busy} onError={setError} onNotice={setNotice} onReload={load}/>)}{!categories.length&&!searchBusy&&<p className="empty-note">Nenhuma categoria cadastrada.</p>}</div>
    </>}
  </section>
}
function Metric({label,value}:{label:string;value:number}) { return <div className="admin-metric"><span>{label}</span><strong>{String(value).padStart(2,'0')}</strong></div> }
function CategoryRow({category,csrf,busy,onError,onNotice,onReload}:{category:Category;csrf:string;busy:boolean;onError:(s:string)=>void;onNotice:(s:string)=>void;onReload:()=>Promise<void>}) {
  const [name,setName]=useState(category.name)
  async function act(method:'PUT'|'DELETE') { onError('');onNotice('');try { await request(`/categories/${encodeURIComponent(category.name)}`,csrf,{method,...(method==='PUT'?{body:JSON.stringify({name})}:{})});onNotice(method==='PUT'?'Categoria atualizada.':'Categoria removida.');await onReload() } catch(e) { onError(message(e)) } }
  return <div className="admin-category-row"><input aria-label="Nome da categoria" value={name} onChange={e=>setName(e.target.value)} maxLength={80}/><button className="button button-secondary" disabled={busy||name===category.name} onClick={()=>void act('PUT')}>Salvar</button><button className="text-link" disabled={busy} onClick={()=>void act('DELETE')}>Excluir</button></div>
}
