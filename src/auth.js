import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

export async function authMiddleware(c, next) {
  const user = getCookie(c, 'user')
  if (!user) return c.redirect('/login')
  c.set('user', user)
  await next()
}

export const apiAuth = new Hono()

apiAuth.post('/login', async c => {
  const { username, password } = await c.req.json()
  const user = await c.env.DB.prepare(`
    SELECT * FROM users WHERE username = ?
  `).bind(username).first()
  if (!user || user.password_hash !== password) {
    return c.json({ ok: false })
  }
  setCookie(c, 'user', username)
  return c.json({ ok: true })
})

apiAuth.get('/me', async c => {
  const user = getCookie(c, 'user')
  return c.json({ user: user || null })
})

apiAuth.get('/logout', c => {
  setCookie(c, 'user', '', { maxAge: 0 })
  return c.redirect('/login')
})
