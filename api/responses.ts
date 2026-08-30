import { del, get, list, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { RsvpRecord } from './rsvp.js'

function authorized(request: VercelRequest) {
  const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  const token = bearer || request.query.token
  return Boolean(process.env.ADMIN_EXPORT_TOKEN && token === process.env.ADMIN_EXPORT_TOKEN)
}

async function allBlobs() {
  const blobs: Awaited<ReturnType<typeof list>>['blobs'] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'rsvps/', cursor, limit: 1000 })
    blobs.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return blobs
}

async function readRecord(pathname: string) {
  const result = await get(pathname, { access: 'private' })
  if (result?.statusCode !== 200 || !result.stream) return null
  return await new Response(result.stream).json() as RsvpRecord
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('Cache-Control', 'private, no-store')
  if (!authorized(request)) return response.status(401).json({ error: 'No autorizado' })

  if (request.method === 'GET') {
    const records = (await Promise.all((await allBlobs()).map((blob) => readRecord(blob.pathname))))
      .filter((record): record is RsvpRecord => Boolean(record))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return response.status(200).json(records)
  }

  const id = typeof request.body?.id === 'string' ? request.body.id : ''
  const blob = (await allBlobs()).find((item) => item.pathname.endsWith(`/${id}.json`))
  if (!blob) return response.status(404).json({ error: 'Respuesta no encontrada' })

  if (request.method === 'DELETE') {
    await del(blob.pathname)
    return response.status(200).json({ ok: true })
  }

  if (request.method === 'PATCH') {
    const current = await readRecord(blob.pathname)
    if (!current) return response.status(404).json({ error: 'Respuesta no encontrada' })
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
    const attendance = request.body?.attendance
    const guests = Array.isArray(request.body?.guests) ? request.body.guests.map((guest: unknown) => String(guest).trim()).filter(Boolean) : []
    if (!name || name.length > 80 || !['yes', 'no'].includes(attendance) || guests.length > 8) {
      return response.status(400).json({ error: 'Datos inválidos' })
    }
    const updated: RsvpRecord = { ...current, name, attendance, guests: attendance === 'yes' ? guests : [] }
    await put(blob.pathname, JSON.stringify(updated), { access: 'private', contentType: 'application/json', allowOverwrite: true, addRandomSuffix: false })
    return response.status(200).json(updated)
  }

  response.setHeader('Allow', 'GET, PATCH, DELETE')
  return response.status(405).json({ error: 'Método no permitido' })
}
