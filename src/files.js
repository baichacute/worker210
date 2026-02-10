import { Hono } from 'hono'
import { authMiddleware } from './auth'
import { isBlockedFilename, expireToUnix, isExpired } from './utils'
import { getCookie } from 'hono/cookie'
import { gzipSync, gunzipSync } from 'zlib'

export const apiFile = new Hono()

apiFile.post('/create', authMiddleware, async c => {
  const { filename, expire, encrypted } = await c.req.json()
  if (isBlockedFilename(filename, c.env.BLOCKED_EXTENSIONS)) {
    return c.json({ ok: false, msg: '不允许此类文件' })
  }
  const fileId = crypto.randomUUID()
  const expireAt = expireToUnix(expire)
  await c.env.DB.prepare(`
    INSERT INTO files (
      file_id, filename, total_size, total_chunks,
      chunk_size, mime_type, is_compressed, is_encrypted,
      encrypt_key_sha256, is_private, expire_at,
      uploader_type, uploader_id, created_at
    ) VALUES (?, ?, 0, 0, ?, ?, 0, ?, NULL, ?, ?, 'user', ?, ?)
  `).bind(
    fileId, filename, c.env.CHUNK_SIZE,
    'application/octet-stream', encrypted ? 1 : 0,
    c.env.DEFAULT_FILE_PRIVATE ? 1 : 0,
    expireAt, c.get('user'), Math.floor(Date.now()/1000)
  ).run()
  return c.json({ ok: true, file_id: fileId })
})

apiFile.post('/chunk', authMiddleware, async c => {
  const { file_id, index } = c.req.query()
  const blob = await c.req.blob()
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const file = await c.env.DB.prepare(`
    SELECT * FROM files WHERE file_id = ?
  `).bind(file_id).first()
  if (!file) return c.json({ ok: false })

  const compress = c.env.AUTO_COMPRESS === 'true'
  let out = bytes
  if (compress) out = gzipSync(bytes)
  const size = out.length

  const kvKey = `chunk_${file_id}_${index}`
  await c.env.KV.put(kvKey, out)

  await c.env.DB.prepare(`
    INSERT OR IGNORE INTO file_chunks
      (file_id, chunk_index, kv_key, chunk_size, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(file_id, index, kvKey, size, Math.floor(Date.now()/1000)).run()

  await c.env.DB.prepare(`
    UPDATE kv_storage_stats
    SET total_size = total_size + ?, updated_at = ?
    WHERE id = 1
  `).bind(size, Math.floor(Date.now()/1000)).run()

  return c.json({ ok: true })
})

apiFile.post('/finish', authMiddleware, async c => {
  const { file_id, total_size, total_chunks, mime } = await c.req.json()
  await c.env.DB.prepare(`
    UPDATE files
    SET total_size = ?, total_chunks = ?, mime_type = ?
    WHERE file_id = ?
  `).bind(total_size, total_chunks, mime, file_id).run()
  return c.json({ ok: true })
})

apiFile.get('/:file_id', async c => {
  const fileId = c.req.param('file_id')
  const file = await c.env.DB.prepare(`
    SELECT * FROM files WHERE file_id = ?
  `).bind(fileId).first()
  if (!file || isExpired(file)) return c.text('过期或不存在', 404)

  const user = getCookie(c, 'user')
  const guest = getCookie(c, 'guest_id')
  const opType = user ? 'user' : 'guest'
  const opId = user || guest

  if (file.is_private === 1 && file.uploader_id !== user) {
    return c.text('无权限', 403)
  }

  const chunks = await c.env.DB.prepare(`
    SELECT * FROM file_chunks
    WHERE file_id = ?
    ORDER BY chunk_index ASC
  `).bind(fileId).all()

  let buf = new Uint8Array()
  for (const ch of chunks.results) {
    const val = await c.env.KV.get(ch.kv_key, 'arrayBuffer')
    const part = new Uint8Array(val)
    const tmp = new Uint8Array(buf.length + part.length)
    tmp.set(buf, 0)
    tmp.set(part, buf.length)
    buf = tmp
  }

  let out = buf
  if (file.is_compressed) out = gunzipSync(buf)
  const data = new Blob([out], { type: file.mime_type })

  await c.env.DB.prepare(`
    INSERT INTO file_logs
      (file_id, operator_type, operator_id, action, ip, ua, created_at)
    VALUES (?, ?, ?, 'download', ?, ?, ?)
  `).bind(
    fileId, opType, opId,
    c.req.header('CF-Connecting-IP') || '',
    c.req.header('User-Agent') || '',
    Math.floor(Date.now()/1000)
  ).run()

  return c.body(data, 200, {
    'Content-Type': file.mime_type,
    'Content-Disposition': `attachment; filename="${file.filename}"`
  })
})

apiFile.post('/:file_id/public', authMiddleware, async c => {
  await c.env.DB.prepare(`
    UPDATE files SET is_private = 0 WHERE file_id = ?
  `).bind(c.req.param('file_id')).run()
  return c.json({ ok: true })
})

apiFile.post('/:file_id/private', authMiddleware, async c => {
  await c.env.DB.prepare(`
    UPDATE files SET is_private = 1 WHERE file_id = ?
  `).bind(c.req.param('file_id')).run()
  return c.json({ ok: true })
})

apiFile.get('/my/list', authMiddleware, async c => {
  const user = c.get('user')
  const list = await c.env.DB.prepare(`
    SELECT * FROM files WHERE uploader_id = ?
  `).bind(user).all()
  return c.json(list.results.filter(f => !isExpired(f)))
})

