import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import { authMiddleware, apiAuth } from './auth'
import { apiFile } from './files'
import { apiStorage } from './storage'
import { apiLogs } from './logs'
import { apiGuest } from './guest'
import { initDB } from './db'

const app = new Hono()

app.use('*', async (c, next) => {
  await initDB(c.env.DB)
  await next()
})

app.get('/', serveStatic({ path: 'index.html' }))
app.get('/login', serveStatic({ path: 'login.html' }))
app.get('/upload', authMiddleware, serveStatic({ path: 'upload.html' }))
app.get('/dashboard', authMiddleware, serveStatic({ path: 'dashboard.html' }))
app.get('/guest', serveStatic({ path: 'guest.html' }))

app.route('/api/auth', apiAuth)
app.route('/api/file', apiFile)
app.route('/api/storage', apiStorage)
app.route('/api/logs', apiLogs)
app.route('/api/guest', apiGuest)

app.all('*', c => c.text('Not found', 404))

export default app
