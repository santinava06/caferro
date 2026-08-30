import { useEffect, useMemo, useState } from 'react'

type Rsvp = { id: string; name: string; attendance: 'yes' | 'no'; guests: string[]; createdAt: string }
type AdminNotice = { kind: 'delete'; record: Rsvp } | { kind: 'success' | 'error'; message: string } | null

export default function Admin() {
  const queryToken = new URLSearchParams(window.location.search).get('token') || ''
  const [token, setToken] = useState(() => queryToken || sessionStorage.getItem('rsvp-admin-token') || '')
  const [records, setRecords] = useState<Rsvp[]>([])
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Rsvp | null>(null)
  const [notice, setNotice] = useState<AdminNotice>(null)
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
    if (!response.ok) return setNotice({ kind: 'error', message: 'No se pudieron guardar los cambios.' })
    const updated: Rsvp = await response.json()
    setRecords(records.map((item) => item.id === updated.id ? updated : item))
    setEditing(null)
    setNotice({ kind: 'success', message: `La respuesta de ${updated.name} fue actualizada.` })
  }

  function remove(record: Rsvp) {
    setNotice({ kind: 'delete', record })
  }

  async function deleteRecord(record: Rsvp) {
    const response = await fetch('/api/responses', { method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id }) })
    if (!response.ok) return setNotice({ kind: 'error', message: 'No se pudo eliminar la respuesta.' })
    setRecords(records.filter((item) => item.id !== record.id))
    setNotice({ kind: 'success', message: `La respuesta de ${record.name} fue eliminada.` })
  }

  async function downloadExcel() {
    const response = await fetch('/api/responses.xlsx', { headers: auth })
    if (!response.ok) return setNotice({ kind: 'error', message: 'No se pudo generar el archivo de Excel.' })
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'respuestas-caferro-23.xlsx'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!token) return <Login submit={setToken} />

  return <main className="min-h-screen bg-zinc-950 px-4 py-6 text-stone-100 md:px-[5vw] md:py-14">
    <header className="border-b border-white/15 pb-6 md:flex md:items-end md:justify-between md:gap-6 md:pb-8">
      <div><p className="label text-lime-300">[ PANEL PRIVADO ]</p><h1 className="mt-2 font-display text-[11vw] leading-none tracking-[-.06em] sm:text-5xl md:mt-3 md:text-6xl">RESPUESTAS RSVP</h1></div>
      <div className="mt-6 grid grid-cols-2 gap-2 md:mt-0 md:flex md:gap-3"><a href="/" className="grid min-h-12 place-items-center border border-white/20 px-3 text-center font-mono text-[9px] tracking-widest hover:border-white md:px-4 md:text-[10px]">VER INVITACIÓN</a><button onClick={downloadExcel} className="min-h-12 bg-lime-300 px-3 font-mono text-[9px] font-medium tracking-widest text-black hover:bg-white md:px-4 md:text-[10px]">DESCARGAR EXCEL</button></div>
    </header>

    <section className="my-5 grid grid-cols-3 gap-px overflow-hidden border border-white/15 bg-white/15 md:my-8">{[['CONFIRMADOS', attending.length], ['INVITADOS', guestCount], ['TOTAL', totalPeople]].map(([label, value]) => <div key={label} className="min-w-0 bg-zinc-950 p-3 sm:p-5 md:p-6"><p className="font-mono text-[7px] leading-tight tracking-[.12em] text-zinc-500 sm:text-[9px]">{label}</p><strong className="mt-2 block font-display text-3xl text-lime-300 sm:text-4xl md:mt-3 md:text-5xl">{value}</strong></div>)}</section>

    {error && <div className="mb-5 flex flex-col gap-3 border border-red-500/40 bg-red-500/10 p-4 font-mono text-xs text-red-300 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button onClick={() => { sessionStorage.removeItem('rsvp-admin-token'); setToken(''); setError('') }} className="min-h-10 self-start border border-red-300/40 px-3 sm:self-auto">CAMBIAR TOKEN</button></div>}

    {loading ? <p className="py-20 text-center font-mono text-xs tracking-widest text-zinc-500">CARGANDO...</p> : <>
      <div className="space-y-3 md:hidden">{records.map((record) => <RsvpCard key={record.id} record={record} edit={() => setEditing({...record})} remove={() => remove(record)} />)}{records.length === 0 && <Empty />}</div>
      <div className="hidden overflow-x-auto border border-white/15 md:block"><table className="w-full min-w-[800px] border-collapse text-left"><thead className="bg-lime-300 font-mono text-[10px] tracking-widest text-black"><tr><th className="p-4">NOMBRE</th><th className="p-4">ASISTE</th><th className="p-4">INVITADOS</th><th className="p-4">TOTAL</th><th className="p-4">RESPONDIÓ</th><th className="p-4 text-right">ACCIONES</th></tr></thead><tbody>{records.map(record => <tr key={record.id} className={`border-t border-white/10 ${record.guests.length ? 'bg-violet-950/40' : ''}`}><td className="p-4 font-medium">{record.name}</td><td className="p-4"><Status value={record.attendance} /></td><td className="p-4 text-sm text-zinc-400">{record.guests.join(', ') || '—'}</td><td className="p-4 font-mono">{record.attendance === 'yes' ? record.guests.length + 1 : 0}</td><td className="p-4 font-mono text-xs text-zinc-500">{formatDate(record.createdAt)}</td><td className="p-4 text-right"><button onClick={() => setEditing({...record})} className="mr-4 min-h-10 font-mono text-[10px] text-lime-300">EDITAR</button><button onClick={() => remove(record)} className="min-h-10 font-mono text-[10px] text-red-400">ELIMINAR</button></td></tr>)}</tbody></table>{records.length === 0 && <Empty />}</div>
    </>}
    {editing && <EditModal record={editing} setRecord={setEditing} close={() => setEditing(null)} save={save} />}
    {notice && <AdminNoticeModal notice={notice} close={() => setNotice(null)} confirmDelete={deleteRecord} />}
  </main>
}

function RsvpCard({ record, edit, remove }: { record: Rsvp; edit: () => void; remove: () => void }) {
  return <article className={`border p-4 ${record.guests.length ? 'border-violet-500/40 bg-violet-950/30' : 'border-white/15'}`}>
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-lg font-semibold">{record.name}</p><p className="mt-1 font-mono text-[9px] text-zinc-500">{formatDate(record.createdAt)}</p></div><Status value={record.attendance} /></div>
    <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 border-y border-white/10 py-3"><div><p className="label text-zinc-600">INVITADOS</p><p className="mt-1 text-sm text-zinc-300">{record.guests.join(', ') || 'Sin invitados'}</p></div><div className="text-right"><p className="label text-zinc-600">TOTAL</p><strong className="mt-1 block font-display text-2xl text-lime-300">{record.attendance === 'yes' ? record.guests.length + 1 : 0}</strong></div></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={edit} className="min-h-11 border border-lime-300/50 font-mono text-[10px] text-lime-300">EDITAR</button><button onClick={remove} className="min-h-11 border border-red-500/30 font-mono text-[10px] text-red-400">ELIMINAR</button></div>
  </article>
}

function Status({ value }: { value: Rsvp['attendance'] }) { return <span className={`shrink-0 border px-2 py-1 font-mono text-[9px] ${value === 'yes' ? 'border-lime-300/40 bg-lime-300/10 text-lime-300' : 'border-white/15 text-zinc-500'}`}>{value === 'yes' ? 'ASISTE' : 'NO ASISTE'}</span> }
function Empty() { return <p className="p-12 text-center text-sm text-zinc-500">Todavía no hay respuestas.</p> }
function formatDate(value: string) { return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) }

function Login({ submit }: { submit: (token: string) => void }) {
  const [draft, setDraft] = useState('')
  return <main className="grid min-h-[100svh] place-items-center bg-zinc-950 p-4 text-white"><form onSubmit={e => { e.preventDefault(); submit(draft) }} className="w-full max-w-md border border-white/15 p-6 sm:p-8"><p className="label text-lime-300">[ ACCESO PRIVADO ]</p><h1 className="mt-4 font-display text-4xl">ADMIN RSVP</h1><label className="label mt-10 block">TOKEN<input autoFocus required type="password" value={draft} onChange={e => setDraft(e.target.value)} className="mt-3 block min-h-14 w-full border border-white/20 bg-transparent p-4 font-sans text-base outline-none focus:border-lime-300" /></label><button className="mt-4 min-h-14 w-full bg-lime-300 p-4 font-mono text-xs text-black">ENTRAR</button></form></main>
}

function AdminNoticeModal({ notice, close, confirmDelete }: { notice: Exclude<AdminNotice, null>; close: () => void; confirmDelete: (record: Rsvp) => Promise<void> }) {
  const [deleting, setDeleting] = useState(false)
  const isDelete = notice.kind === 'delete'
  const isError = notice.kind === 'error'

  async function handleDelete() {
    if (!isDelete || deleting) return
    setDeleting(true)
    await confirmDelete(notice.record)
  }

  return <div className="fixed inset-0 z-[60] flex items-end bg-black/85 backdrop-blur-sm sm:grid sm:place-items-center sm:p-4" role={isDelete ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby="admin-notice-title" aria-describedby="admin-notice-description">
    <div className={`w-full border-t bg-zinc-950 p-5 sm:max-w-md sm:border ${isError || isDelete ? 'border-red-500/50' : 'border-lime-300/50'}`}>
      <div className={`grid size-12 place-items-center border font-display text-2xl ${isError || isDelete ? 'border-red-500/40 bg-red-500/10 text-red-400' : 'border-lime-300/40 bg-lime-300/10 text-lime-300'}`} aria-hidden="true">
        {isDelete ? '!' : isError ? '×' : '✓'}
      </div>
      <p className={`label mt-5 ${isError || isDelete ? 'text-red-400' : 'text-lime-300'}`}>{isDelete ? '[ CONFIRMAR ACCIÓN ]' : isError ? '[ OCURRIÓ UN ERROR ]' : '[ CAMBIOS GUARDADOS ]'}</p>
      <h2 id="admin-notice-title" className="mt-2 font-display text-3xl">{isDelete ? '¿ELIMINAR RESPUESTA?' : isError ? 'NO SE PUDO COMPLETAR' : 'LISTO'}</h2>
      <p id="admin-notice-description" className="mt-4 text-sm leading-relaxed text-zinc-400">
        {isDelete ? <>Vas a eliminar la respuesta de <strong className="text-white">{notice.record.name}</strong>. Esta acción no se puede deshacer.</> : notice.message}
      </p>
      {isDelete ? <div className="mt-7 grid grid-cols-2 gap-2 sm:gap-3">
        <button type="button" onClick={close} disabled={deleting} className="min-h-12 border border-white/20 p-3 font-mono text-[10px] disabled:opacity-40">CANCELAR</button>
        <button type="button" onClick={handleDelete} disabled={deleting} className="min-h-12 bg-red-500 p-3 font-mono text-[10px] text-white disabled:opacity-60">{deleting ? 'ELIMINANDO...' : 'ELIMINAR'}</button>
      </div> : <button type="button" onClick={close} autoFocus className={`mt-7 min-h-12 w-full p-3 font-mono text-[10px] text-black ${isError ? 'bg-red-400' : 'bg-lime-300'}`}>{isError ? 'CERRAR' : 'ENTENDIDO'}</button>}
    </div>
  </div>
}

function EditModal({ record, setRecord, close, save }: { record: Rsvp; setRecord: (value: Rsvp) => void; close: () => void; save: (value: Rsvp) => void }) {
  return <div className="fixed inset-0 z-50 flex items-end bg-black/80 sm:grid sm:place-items-center sm:p-4"><form onSubmit={e => { e.preventDefault(); save(record) }} className="max-h-[92svh] w-full overflow-y-auto border-t border-white/20 bg-zinc-950 p-5 sm:max-w-lg sm:border sm:p-7"><div className="flex items-center justify-between gap-4"><h2 className="font-display text-2xl">EDITAR RESPUESTA</h2><button type="button" onClick={close} aria-label="Cerrar" className="grid size-11 shrink-0 place-items-center border border-white/15">✕</button></div><label className="label mt-7 block">NOMBRE<input required value={record.name} onChange={e => setRecord({...record, name: e.target.value})} className="mt-2 block min-h-12 w-full border border-white/20 bg-transparent p-3 text-base outline-none focus:border-lime-300" /></label><label className="label mt-5 block">ASISTENCIA<select value={record.attendance} onChange={e => setRecord({...record, attendance: e.target.value as 'yes' | 'no'})} className="mt-2 block min-h-12 w-full border border-white/20 bg-zinc-900 p-3 text-base"><option value="yes">Sí, asiste</option><option value="no">No asiste</option></select></label><label className="label mt-5 block">INVITADOS (SEPARADOS POR COMA)<textarea value={record.guests.join(', ')} onChange={e => setRecord({...record, guests: e.target.value.split(',').map(item => item.trim()).filter(Boolean)})} rows={3} className="mt-2 block w-full border border-white/20 bg-transparent p-3 text-base outline-none focus:border-lime-300" /></label><div className="mt-7 grid grid-cols-2 gap-2 sm:gap-3"><button type="button" onClick={close} className="min-h-12 border border-white/20 p-3 font-mono text-[10px]">CANCELAR</button><button className="min-h-12 bg-lime-300 p-3 font-mono text-[10px] text-black">GUARDAR</button></div></form></div>
}
