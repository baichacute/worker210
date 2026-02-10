import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { isExpired } from './utils'

export const apiGuest = new Hono()

apiGuest.get('/info', async c => {
  let cookie = getCookie(c, 'guest_id')
  if (!cookie) {
    cookie = crypto.randomUUID()
    setCookie(c, 'guest_id', cookie)
  }
  let guest = await c.env.DB.prepare(`
    SELECT * FROM guest_sessions WHERE cookie_id = ?
  `).bind(cookie).first()
  if (!guest) {
    const guestId = crypto.randomUUID()
    await c.env.DB.prepare(`
      INSERT INTO guest_sessions (guest_id, cookie_id, last_active, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(guestId, cookie, Math.floor(Date.now()/1000), Math.floor(Date.now()/1000)).run()
    guest = { guest_id: guestId }
  }
  return c.json({ guest_id: guest.guest_id })
})

apiGuest.get('/files', async c => {
  const files = await c.env.DB.prepare(`
    SELECT * FROM files WHERE is_private = 0
  `).all()
  const list = files.results.filter(f => !isExpired(f))
  return c.json(list)
})

