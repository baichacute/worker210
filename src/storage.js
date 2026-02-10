import { Hono } from 'hono'

export const apiStorage = new Hono()

apiStorage.get('/info', async c => {
  const maxMB = parseInt(c.env.MAX_KV_TOTAL_SIZE_MB)
  const row = await c.env.DB.prepare(`
    SELECT total_size FROM kv_storage_stats WHERE id = 1
  `).first()
  const usedBytes = row?.total_size || 0
  const usedMB = (usedBytes / 1024 / 1024).toFixed(2)
  const remain = Math.max(0, maxMB - parseFloat(usedMB))
  return c.json({
    total_mb: maxMB,
    used_mb: usedMB,
    remaining_mb: remain.toFixed(2)
  })
})
