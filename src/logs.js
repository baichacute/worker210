import { Hono } from 'hono'
import { authMiddleware } from './auth'

export const apiLogs = new Hono()

apiLogs.get('/my', authMiddleware, async c => {
  const user = c.get('user')
  const logs = await c.env.DB.prepare(`
    SELECT * FROM file_logs
    WHERE operator_id = ?
    ORDER BY created_at DESC
  `).bind(user).all()
  return c.json(logs)
})

