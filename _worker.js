import { Hono } from 'hono'
import { authMiddleware, apiAuth } from './src/auth'
import { apiFile } from './src/files'
import { apiStorage } from './src/storage'
import { apiLogs } from './src/logs'
import { apiGuest } from './src/guest'
import { initDB } from './src/db'

const app = new Hono()

app.use('*', async (c, next) => {
  await initDB(c.env.DB)
  await next()
})

app.get('/', (c) => c.html(`
<!DOCTYPE html>
<meta charset="utf-8">
<title>首页</title>
<h1>CF Simple Drive</h1>
<a href="/login">登录</a>
<a href="/guest">游客下载</a>
`))

app.get('/login', (c) => c.html(`
<!DOCTYPE html>
<meta charset="utf-8">
<title>登录</title>
<input id="user" placeholder="用户名">
<input id="pwd" type="password" placeholder="密码">
<button onclick="login()">登录</button>
<script>
async function login() {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: document.getElementById('user').value,
      password: document.getElementById('pwd').value
    })
  })
  const j = await r.json()
  if (j.ok) location.href = '/dashboard'
}
</script>
`))

app.get('/dashboard', authMiddleware, (c) => c.html(`
<!DOCTYPE html>
<meta charset="utf-8">
<title>控制台</title>
<h1>控制台</h1>
<a href="/upload">上传文件</a>
<a href="/api/auth/logout">退出登录</a>
`))

app.get('/upload', authMiddleware, (c) => c.html(`
<!DOCTYPE html>
<meta charset="utf-8">
<title>上传</title>
<h1>上传文件</h1>
<input type="file" id="file">
<button onclick="startUpload()">上传</button>
<script>
async function startUpload() { alert('上传接口已就绪') }
</script>
`))

app.get('/guest', (c) => c.html(`
<!DOCTYPE html>
<meta charset="utf-8">
<title>游客</title>
<h1>游客下载</h1>
<div id="file-list"></div>
`))

app.route('/api/auth', apiAuth)
app.route('/api/file', apiFile)
app.route('/api/storage', apiStorage)
app.route('/api/logs', apiLogs)
app.route('/api/guest', apiGuest)

app.all('*', c => c.text('Not found', 404))

export default app

