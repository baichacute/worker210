export function isBlockedFilename(filename, blockedExts) {
  const exts = blockedExts.split(',')
  const ext = filename.split('.').pop().toLowerCase()
  return exts.includes(ext)
}

export function expireToUnix(exp) {
  const now = Math.floor(Date.now() / 1000)
  switch (exp) {
    case '1h': return now + 3600
    case '1d': return now + 86400
    case '3d': return now + 259200
    case '7d': return now + 604800
    case '30d': return now + 2592000
    case 'never': return null
    default: return null
  }
}

export function isExpired(file) {
  if (!file.expire_at) return false
  return Math.floor(Date.now() / 1000) > file.expire_at
}

