export async function initDB(DB) {
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run()

  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS guest_sessions (
      guest_id TEXT PRIMARY KEY,
      cookie_id TEXT UNIQUE NOT NULL,
      last_active INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run()

  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS files (
      file_id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      total_size INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      chunk_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      is_compressed INTEGER NOT NULL,
      is_encrypted INTEGER NOT NULL,
      encrypt_key_sha256 TEXT NULL,
      is_private INTEGER NOT NULL,
      expire_at INTEGER NULL,
      uploader_type TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run()

  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS file_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      kv_key TEXT NOT NULL,
      chunk_size INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(file_id, chunk_index)
    )
  `).run()

  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS file_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id TEXT NOT NULL,
      operator_type TEXT NOT NULL,
      operator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      ip TEXT,
      ua TEXT,
      created_at INTEGER NOT NULL
    )
  `).run()

  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS kv_storage_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_size INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `).run()

  await DB.prepare(`
    INSERT OR IGNORE INTO kv_storage_stats (id, total_size, updated_at)
    VALUES (1, 0, ?)
  `).bind(Math.floor(Date.now() / 1000)).run()
}

