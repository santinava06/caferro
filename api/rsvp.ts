import { put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export type RsvpRecord = {
  id: string
  name: string
  attendance: 'yes' | 'no'
  guests: string[]
  createdAt: string
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Método no permitido' })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return response.status(503).json({ error: 'El almacenamiento todavía no está configurado' })
  }

  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
  const attendance = request.body?.attendance
  const guests = Array.isArray(request.body?.guests)
    ? request.body.guests.filter((guest: unknown): guest is string => typeof guest === 'string').map((guest: string) => guest.trim()).filter(Boolean)
    : []

  if (!name || name.length > 80 || !['yes', 'no'].includes(attendance) || guests.length > 8 || guests.some((guest: string) => guest.length > 80)) {
    return response.status(400).json({ error: 'Revisá los datos enviados' })
  }

  const record: RsvpRecord = {
    id: crypto.randomUUID(),
    name,
    attendance,
    guests: attendance === 'yes' ? guests : [],
    createdAt: new Date().toISOString(),
  }

  await put(`rsvps/${record.createdAt.slice(0, 10)}/${record.id}.json`, JSON.stringify(record), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
  })

  return response.status(201).json({ ok: true })
}
