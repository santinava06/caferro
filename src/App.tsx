import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

const party = { host: 'CAFERRO', age: '23', date: 'SÁB 05 SEP 2026', time: '23:30', venue: 'UBICACIÓN SECRETA', city: 'SAN MIGUEL DE TUCUMÁN' }
const details = [['01 / CUÁNDO', party.date, `Puertas ${party.time} hs`, 'Hasta que salga el sol'], ['02 / DÓNDE', party.venue, party.city, 'Dirección al confirmar'], ['03 / ACTITUD', 'SIN DRESS CODE', 'Sin excusas', 'Solo ganas de bailar']]
const sets = [['01:00—02:00', 'ENTRADA', 'OPENING'], ['02:00—05:00', 'SANTI RIVADENEIRA', 'TECHNO'], ['05:00—08:00', 'ZOE MORZADEC', 'TECHNO']]

function App() {
  const heroRef = useRef<HTMLElement>(null)
  const [menu, setMenu] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [name, setName] = useState('')
  const [attendance, setAttendance] = useState('')
  const [guests, setGuests] = useState([''])
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, attendance, guests: guests.filter((guest) => guest.trim()) }),
      })
      if (!response.ok) throw new Error('No se pudo guardar la respuesta')
      setConfirmed(true)
    } catch {
      window.alert('No pudimos guardar tu respuesta. Probá nuevamente.')
    }
  }

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const update = (x = window.innerWidth / 2, y = window.innerHeight / 2) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect()
        const px = (x / window.innerWidth - 0.5) * 2
        const py = (y / window.innerHeight - 0.5) * 2
        const scroll = Math.max(0, Math.min(1, -rect.top / rect.height))
        hero.style.setProperty('--parallax-x', px.toFixed(3))
        hero.style.setProperty('--parallax-y', py.toFixed(3))
        hero.style.setProperty('--parallax-scroll', scroll.toFixed(3))
        hero.style.setProperty('--glow-x', `${Math.max(8, Math.min(92, (x / window.innerWidth) * 100)).toFixed(1)}%`)
        hero.style.setProperty('--glow-y', `${Math.max(8, Math.min(92, (y / window.innerHeight) * 100)).toFixed(1)}%`)
      })
    }
    const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY)
    const onScroll = () => update()
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('scroll', onScroll) }
  }, [])

  return <main className="overflow-hidden bg-zinc-950 text-stone-100 selection:bg-lime-300 selection:text-black">
    <header className="absolute z-30 flex h-16 w-full items-center justify-between border-b border-white/20 px-[5vw] md:h-20">
      <a href="#inicio" className="font-display text-2xl tracking-[-.12em]">B<span className="text-lime-300">/</span>23</a>
      <button onClick={() => setMenu(!menu)} className="font-mono text-[10px] tracking-[.2em] md:hidden">{menu ? 'CERRAR' : 'MENÚ'}</button>
      <nav className={`${menu ? 'flex' : 'hidden'} absolute left-0 top-16 w-full flex-col gap-6 bg-zinc-950 p-6 font-mono text-[10px] tracking-[.2em] md:static md:flex md:w-auto md:flex-row md:bg-transparent md:p-0`}><a href="#info">INFO</a><a href="#rsvp">RSVP</a></nav>
    </header>
    <section ref={heroRef} id="inicio" className="hero-bg relative isolate flex min-h-[780px] flex-col justify-between px-[5vw] pb-14 pt-28 md:min-h-screen md:pb-16 md:pt-32">
      <div className="noise pointer-events-none absolute inset-0 -z-10 opacity-25" /><div className="pulse-orb absolute left-1/2 top-[30%] -z-10 size-[90vw] -translate-x-1/2 rounded-full md:top-[17%] md:size-[42vw]" />
      <p className="text-center font-mono text-[9px] tracking-[.25em]">FESTEJEMOS JUNTOS</p>
      <div className="flex flex-col items-center justify-center font-display leading-[.72] tracking-[-.08em] md:flex-row"><span className="parallax-host max-w-full whitespace-nowrap text-[19vw] md:text-[12vw]">{party.host}</span><strong className="parallax-age outline-text text-[19vw] font-normal md:text-[12vw]">{party.age}</strong></div>
      <div className="grid grid-cols-2 items-end font-mono text-[9px] leading-relaxed tracking-[.14em] md:grid-cols-[1fr_auto_1fr]"><p>UNA NOCHE<br />FUERA DE FRECUENCIA</p><a href="#rsvp" aria-label="Confirmar asistencia" className="hidden size-16 place-items-center rounded-full border border-white text-2xl transition hover:bg-lime-300 hover:text-black md:grid">↓</a><p className="text-right">{party.date}<br />{party.city}</p></div>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-lime-300 py-2 font-mono text-[10px] font-medium text-black"><div className="marquee w-max whitespace-nowrap">TECHNO · FRIENDS · ALL NIGHT LONG · NO PHOTOS · TECHNO · FRIENDS · ALL NIGHT LONG · NO PHOTOS · TECHNO · FRIENDS · ALL NIGHT LONG · NO PHOTOS ·&nbsp;</div></div>
    </section>
    <section className="grid gap-10 border-b border-white/15 px-[5vw] py-24 md:grid-cols-[1fr_3fr] md:py-40"><p className="label">[ LA INVITACIÓN ]</p><div><h1 className="font-display text-[12vw] leading-[.92] tracking-[-.065em] md:text-[6.5vw]">APAGAMOS EL MUNDO.<br /><span className="text-lime-300">ENCENDEMOS LA NOCHE.</span></h1><p className="ml-auto mt-12 max-w-xl text-lg leading-relaxed text-zinc-400">Cumplo {party.age} y quiero celebrarlo con la gente que hace que todo suene mejor. Una fecha, un lugar y muchas horas para bailar.</p></div></section>
    <section id="info" className="grid md:grid-cols-3">{details.map(([label, title, a, b]) => <article key={label} className="flex min-h-72 flex-col border-b border-white/15 p-[5vw] md:min-h-96 md:border-b-0 md:border-r last:border-0"><span className="label">{label}</span><strong className="mt-auto font-display text-3xl leading-none tracking-[-.05em] md:text-[3vw]">{title}</strong><p className="mt-5 font-mono text-xs leading-relaxed text-zinc-500">{a}<br />{b}</p></article>)}</section>
    <section className="bg-violet-700 px-[5vw] py-24 md:py-36"><p className="label mb-12">[ SONIDO DE LA NOCHE ]</p>{sets.map(([time, title, style], i) => <div key={title} className="grid gap-3 border-t border-white/35 py-7 last:border-b md:grid-cols-[180px_1fr_120px] md:items-center"><span className="label">{time}</span><strong className={`font-display text-3xl leading-none tracking-[-.05em] md:text-[4vw] ${i === 1 ? 'text-lime-300' : ''}`}>{title}</strong><i className="label not-italic md:text-right">{style}</i></div>)}</section>
    <section id="rsvp" className="grid min-h-[680px] md:grid-cols-2"><div className="rsvp-glow border-b border-white/15 p-[5vw] py-24 md:border-b-0 md:border-r md:py-28"><p className="label">[ CONFIRMÁ TU LUGAR ]</p><h2 className="mt-28 font-display text-[22vw] leading-[.8] tracking-[-.08em] text-lime-300 md:mt-40 md:text-[10vw]">¿VENÍS?</h2><p className="mt-8 leading-relaxed text-zinc-400">Dejanos tu respuesta.<br />La ubicación exacta llega a quienes estén en lista.</p></div>
      <div className="flex items-center p-[5vw] py-20 md:px-[6vw]">{confirmed ? <div role="status"><span className="text-6xl text-lime-300">✓</span><h3 className="mt-8 font-display text-4xl leading-none md:text-6xl">{attendance === 'yes' ? `TE ESPERAMOS, ${name.toUpperCase()}.` : `GRACIAS POR AVISAR, ${name.toUpperCase()}.`}</h3><p className="mt-6 text-zinc-400">{attendance === 'yes' ? 'Nos vemos en la pista. Guardá esta fecha.' : 'Te vamos a extrañar esta vez.'}</p><button onClick={() => setConfirmed(false)} className="mt-12 border-b pb-2 font-mono text-[10px] tracking-widest">EDITAR RESPUESTA</button></div> : <form onSubmit={submit} className="w-full"><Field label="TU NOMBRE"><input required value={name} onChange={e => setName(e.target.value)} placeholder="Escribí tu nombre" /></Field><fieldset className="border-b border-white/20 py-8"><legend className="label">¿ASISTÍS?</legend><div className="mt-5 grid grid-cols-2 gap-3"><label className={`cursor-pointer border p-5 text-center font-mono text-xs transition ${attendance === 'yes' ? 'border-lime-300 bg-lime-300 text-black' : 'border-white/20 hover:border-white'}`}><input required type="radio" name="attendance" value="yes" checked={attendance === 'yes'} onChange={e => setAttendance(e.target.value)} className="sr-only" /> SÍ, VOY</label><label className={`cursor-pointer border p-5 text-center font-mono text-xs transition ${attendance === 'no' ? 'border-lime-300 bg-lime-300 text-black' : 'border-white/20 hover:border-white'}`}><input required type="radio" name="attendance" value="no" checked={attendance === 'no'} onChange={e => setAttendance(e.target.value)} className="sr-only" /> NO PUEDO</label></div></fieldset><div className="border-b border-white/20 py-6"><div className="flex items-center justify-between"><span className="label">¿VENÍS CON ALGUIEN? (OPCIONAL)</span><button type="button" onClick={() => setGuests([...guests, ''])} aria-label="Agregar otro invitado" className="grid size-9 place-items-center rounded-full border border-lime-300 text-xl text-lime-300 transition hover:bg-lime-300 hover:text-black">+</button></div><div className="mt-2 space-y-2">{guests.map((guest, index) => <div key={index} className="form-control flex items-center gap-3"><input name={`guest-${index + 1}`} value={guest} onChange={e => setGuests(guests.map((item, i) => i === index ? e.target.value : item))} placeholder={index === 0 ? 'Nombre de tu invitado/a' : `Invitado/a ${index + 1}`} />{index > 0 && <button type="button" onClick={() => setGuests(guests.filter((_, i) => i !== index))} aria-label={`Quitar invitado ${index + 1}`} className="text-xl text-zinc-500 transition hover:text-white">−</button>}</div>)}</div></div><button className="mt-8 flex w-full justify-between bg-lime-300 p-5 font-mono text-xs font-medium text-black transition hover:bg-white">ENVIAR RESPUESTA <span>↗</span></button></form>}</div>
    </section>
    <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-white/15 px-[5vw] py-9 font-mono text-[9px] tracking-widest"><a href="#inicio" className="font-display text-2xl">B<span className="text-lime-300">/</span>23</a><p>{party.date} · TUCUMÁN</p><p>HECHO PARA BAILAR</p></footer>
  </main>
}
function Field({ label, children }: { label: string, children: ReactNode }) { return <label className="label block border-b border-white/20 py-6">{label}<div className="form-control mt-3">{children}</div></label> }
export default App
