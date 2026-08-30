import { get, list, put } from '@vercel/blob'
import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export type RsvpRecord = {
  id: string
  name: string
  attendance: 'yes' | 'no'
  guests: string[]
  createdAt: string
}

function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').replace(/\s+/g, ' ').trim()
}

async function nameAlreadyExists(normalizedName: string) {
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'rsvps/', cursor, limit: 1000 })
    const records = await Promise.all(page.blobs.map(async (blob) => {
      const result = await get(blob.pathname, { access: 'private' })
      if (result?.statusCode !== 200 || !result.stream) return null
      return await new Response(result.stream).json() as RsvpRecord
    }))
    if (records.some((record) => record && normalizeName(record.name) === normalizedName)) return true
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return false
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

  const normalizedName = normalizeName(name)
  if (await nameAlreadyExists(normalizedName)) {
    return response.status(409).json({ error: 'Este nombre ya tiene una respuesta registrada' })
  }

  const nameId = createHash('sha256').update(normalizedName).digest('hex').slice(0, 32)

  const record: RsvpRecord = {
    id: nameId,
    name,
    attendance,
    guests: attendance === 'yes' ? guests : [],
    createdAt: new Date().toISOString(),
  }

  try {
    await put(`rsvps/by-name/${record.id}.json`, JSON.stringify(record), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: false,
    })
  } catch (error) {
    if (error instanceof Error && /already|exist|overwrite|409/i.test(error.message)) {
      return response.status(409).json({ error: 'Este nombre ya tiene una respuesta registrada' })
    }
    throw error
  }

  return response.status(201).json({ ok: true })
}
