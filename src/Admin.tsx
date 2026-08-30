import { useEffect, useMemo, useState } from 'react'

type Rsvp = { id: string; name: string; attendance: 'yes' | 'no'; guests: string[]; createdAt: string }

export default function Admin() {
  const queryToken = new URLSearchParams(window.location.search).get('token') || ''
  const [token, setToken] = useState(() => queryToken || sessionStorage.getItem('rsvp-admin-token') || '')
  const [records, setRecords] = useState<Rsvp[]>([])
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Rsvp | null>(null)

  const auth = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const attending = records.filter((record) => record.attendance === 'yes')
  const guestCount = attending.reduce((total, record) => total + record.guests.length, 0)
  const totalPeople = attending.length + guestCount

  useEffect(() => {
    if (!token) return
    fetch('/api/responses', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 401 ? 'Token incorrecto.' : 'No se pudieron cargar las respuestas.')
        return response.json()
      })
      .then((data: Rsvp[]) => {
        setRecords(data)
        sessionStorage.setItem('rsvp-admin-token', token)
        if (queryToken) window.history.replaceState({}, '', '/admin')
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Error inesperado.'))
      .finally(() => setLoading(false))
  }, [queryToken, token])

  async function save(record: Rsvp) {
    const response = await fetch('/api/responses', { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(record) })
    if (!response.ok) return window.alert('No se pudo guardar el cambio.')
    const updated: Rsvp = await response.json()
    setRecords(records.map((item) => item.id === updated.id ? updated : item)); setEditing(null)
  }

  async function remove(record: Rsvp) {
    if (!window.confirm(`¿Eliminar la respuesta de ${record.name}?`)) return
    const response = await fetch('/api/responses', { method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id }) })
    if (!response.ok) return window.alert('No se pudo eliminar la respuesta.')
    setRecords(records.filter((item) => item.id !== record.id))
  }

  async function downloadExcel() {
    const response = await fetch('/api/responses.xlsx', { headers: auth })
    if (!response.ok) return window.alert('No se pudo generar el Excel.')
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'respuestas-caferro-23.xlsx'; anchor.click(); URL.revokeObjectURL(url)
  }

  if (!token) return <Login submit={setToken} />
  return <main className="min-h-screen bg-zinc-950 px-4 py-8 text-stone-100 md:px-[5vw] md:py-14">
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-white/15 pb-8"><div><p className="label text-lime-300">[ PANEL PRIVADO ]</p><h1 className="mt-3 font-display text-4xl tracking-[-.05em] md:text-6xl">RESPUESTAS RSVP</h1></div><div className="flex gap-3"><a href="/" className="border border-white/20 px-4 py-3 font-mono text-[10px] tracking-widest hover:border-white">VER INVITACIÓN</a><button onClick={downloadExcel} className="bg-lime-300 px-4 py-3 font-mono text-[10px] font-medium tracking-widest text-black hover:bg-white">DESCARGAR EXCEL</button></div></header>
    <section className="my-8 grid gap-px overflow-hidden border border-white/15 bg-white/15 md:grid-cols-3">{[['CONFIRMADOS', attending.length], ['INVITADOS EXTRA', guestCount], ['TOTAL DE PERSONAS', totalPeople]].map(([label, value]) => <div key={label} className="bg-zinc-950 p-6"><p className="label text-zinc-500">{label}</p><strong className="mt-3 block font-display text-5xl text-lime-300">{value}</strong></div>)}</section>
    {error && <div className="mb-6 flex items-center justify-between gap-4 border border-red-500/40 bg-red-500/10 p-4 font-mono text-xs text-red-300"><span>{error}</span><button onClick={() => { sessionStorage.removeItem('rsvp-admin-token'); setToken(''); setError('') }} className="shrink-0 border-b border-red-300 pb-1">CAMBIAR TOKEN</button></div>}
    {loading ? <p className="py-20 text-center font-mono text-xs tracking-widest text-zinc-500">CARGANDO...</p> : <div className="overflow-x-auto border border-white/15"><table className="w-full min-w-[800px] border-collapse text-left"><thead className="bg-lime-300 font-mono text-[10px] tracking-widest text-black"><tr><th className="p-4">NOMBRE</th><th className="p-4">ASISTE</th><th className="p-4">INVITADOS</th><th className="p-4">TOTAL</th><th className="p-4">RESPONDIÓ</th><th className="p-4 text-right">ACCIONES</th></tr></thead><tbody>{records.map(record => <tr key={record.id} className={`border-t border-white/10 ${record.guests.length ? 'bg-violet-950/40' : ''}`}><td className="p-4 font-medium">{record.name}</td><td className="p-4"><span className={record.attendance === 'yes' ? 'text-lime-300' : 'text-zinc-500'}>{record.attendance === 'yes' ? 'SÍ' : 'NO'}</span></td><td className="p-4 text-sm text-zinc-400">{record.guests.join(', ') || '—'}</td><td className="p-4 font-mono">{record.attendance === 'yes' ? record.guests.length + 1 : 0}</td><td className="p-4 font-mono text-xs text-zinc-500">{new Date(record.createdAt).toLocaleString('es-AR')}</td><td className="p-4 text-right"><button onClick={() => setEditing({...record})} className="mr-4 font-mono text-[10px] text-lime-300">EDITAR</button><button onClick={() => remove(record)} className="font-mono text-[10px] text-red-400">ELIMINAR</button></td></tr>)}</tbody></table>{records.length === 0 && <p className="p-12 text-center text-zinc-500">Todavía no hay respuestas.</p>}</div>}
    {editing && <EditModal record={editing} setRecord={setEditing} close={() => setEditing(null)} save={save} />}
  </main>
}

function Login({ submit }: { submit: (token: string) => void }) { const [draft, setDraft] = useState(''); return <main className="grid min-h-screen place-items-center bg-zinc-950 p-5 text-white"><form onSubmit={e => { e.preventDefault(); submit(draft) }} className="w-full max-w-md border border-white/15 p-8"><p className="label text-lime-300">[ ACCESO PRIVADO ]</p><h1 className="mt-4 font-display text-4xl">ADMIN RSVP</h1><label className="label mt-10 block">TOKEN<input autoFocus required type="password" value={draft} onChange={e => setDraft(e.target.value)} className="mt-3 block w-full border border-white/20 bg-transparent p-4 font-sans text-base outline-none focus:border-lime-300" /></label><button className="mt-5 w-full bg-lime-300 p-4 font-mono text-xs text-black">ENTRAR</button></form></main> }

function EditModal({ record, setRecord, close, save }: { record: Rsvp; setRecord: (value: Rsvp) => void; close: () => void; save: (value: Rsvp) => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><form onSubmit={e => { e.preventDefault(); save(record) }} className="w-full max-w-lg border border-white/20 bg-zinc-950 p-7"><div className="flex justify-between"><h2 className="font-display text-2xl">EDITAR RESPUESTA</h2><button type="button" onClick={close}>✕</button></div><label className="label mt-7 block">NOMBRE<input required value={record.name} onChange={e => setRecord({...record, name: e.target.value})} className="mt-2 block w-full border border-white/20 bg-transparent p-3 text-base outline-none focus:border-lime-300" /></label><label className="label mt-5 block">ASISTENCIA<select value={record.attendance} onChange={e => setRecord({...record, attendance: e.target.value as 'yes' | 'no'})} className="mt-2 block w-full border border-white/20 bg-zinc-900 p-3 text-base"><option value="yes">Sí, asiste</option><option value="no">No asiste</option></select></label><label className="label mt-5 block">INVITADOS (SEPARADOS POR COMA)<textarea value={record.guests.join(', ')} onChange={e => setRecord({...record, guests: e.target.value.split(',').map(item => item.trim()).filter(Boolean)})} rows={3} className="mt-2 block w-full border border-white/20 bg-transparent p-3 text-base outline-none focus:border-lime-300" /></label><div className="mt-7 flex gap-3"><button type="button" onClick={close} className="flex-1 border border-white/20 p-4 font-mono text-xs">CANCELAR</button><button className="flex-1 bg-lime-300 p-4 font-mono text-xs text-black">GUARDAR</button></div></form></div> }
