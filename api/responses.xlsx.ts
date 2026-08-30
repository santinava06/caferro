import { get, list } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import ExcelJS from 'exceljs'
import type { RsvpRecord } from './rsvp.js'

async function readResponses() {
  const records: RsvpRecord[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'rsvps/', cursor, limit: 1000 })
    for (const blob of page.blobs) {
      const result = await get(blob.pathname, { access: 'private' })
      if (result?.statusCode === 200 && result.stream) {
        records.push(await new Response(result.stream).json() as RsvpRecord)
      }
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function configureSheet(sheet: ExcelJS.Worksheet) {
  sheet.columns = [
    { header: 'Fecha de respuesta', key: 'createdAt', width: 23 },
    { header: 'Nombre', key: 'name', width: 28 },
    { header: 'Asiste', key: 'attendance', width: 12 },
    { header: 'Cantidad de invitados', key: 'guestCount', width: 22 },
    { header: 'Invitados', key: 'guests', width: 45 },
    { header: 'Total del grupo', key: 'total', width: 18 },
  ]
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FF090909' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7FF1A' } }
  sheet.autoFilter = 'A1:F1'
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

function addRecord(sheet: ExcelJS.Worksheet, record: RsvpRecord) {
  sheet.addRow({
    createdAt: new Date(record.createdAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Tucuman' }),
    name: record.name,
    attendance: record.attendance === 'yes' ? 'Sí' : 'No',
    guestCount: record.guests.length,
    guests: record.guests.join(', '),
    total: record.attendance === 'yes' ? record.guests.length + 1 : 0,
  })
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método no permitido' })
  const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  const token = bearer || request.query.token
  if (!process.env.ADMIN_EXPORT_TOKEN || token !== process.env.ADMIN_EXPORT_TOKEN) {
    return response.status(401).json({ error: 'No autorizado' })
  }

  const records = await readResponses()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CAFERRO 23 RSVP'
  const all = workbook.addWorksheet('Todas las respuestas')
  const withGuests = workbook.addWorksheet('Con invitados')
  configureSheet(all)
  configureSheet(withGuests)
  records.forEach((record) => {
    addRecord(all, record)
    if (record.guests.length > 0) addRecord(withGuests, record)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.setHeader('Content-Disposition', `attachment; filename="respuestas-caferro-23-${new Date().toISOString().slice(0, 10)}.xlsx"`)
  response.setHeader('Cache-Control', 'private, no-store')
  return response.status(200).send(Buffer.from(buffer))
}
