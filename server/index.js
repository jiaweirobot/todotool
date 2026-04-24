const express = require('express')
const cors = require('cors')
const path = require('path')
const { initDatabase, getAllTodos, createTodo, updateTodo, deleteTodo, toggleTodoCompleted, getSetting, setSetting, closeDatabase } = require('./database')

const app = express()
const PORT = process.env.PORT || 3456

app.use(cors())
app.use(express.json())

app.use(express.static(path.join(__dirname, '../dist-web')))

app.get('/api/todos', (req, res) => {
  const filter = {
    search: req.query.search || undefined,
    urgency: req.query.urgency !== undefined ? Number(req.query.urgency) : undefined,
    status: req.query.status || undefined
  }
  const todos = getAllTodos(filter)
  res.json(todos)
})

app.post('/api/todos', (req, res) => {
  const todo = createTodo(req.body)
  res.json(todo)
})

app.put('/api/todos/:id', (req, res) => {
  const todo = updateTodo(req.params.id, req.body)
  res.json(todo)
})

app.delete('/api/todos/:id', (req, res) => {
  deleteTodo(req.params.id)
  res.json({ success: true })
})

app.patch('/api/todos/:id/toggle', (req, res) => {
  const todo = toggleTodoCompleted(req.params.id)
  res.json(todo)
})

app.get('/api/settings/:key', (req, res) => {
  const value = getSetting(req.params.key)
  res.json({ key: req.params.key, value })
})

app.put('/api/settings/:key', (req, res) => {
  setSetting(req.params.key, req.body.value)
  res.json({ success: true })
})

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist-web/index.html'))
})

async function start() {
  await initDatabase()
  app.listen(PORT, () => {
    console.log(`TodoTool server running at http://localhost:${PORT}`)
    const { exec } = require('child_process')
    const url = `http://localhost:${PORT}`
    if (process.platform === 'win32') {
      exec(`start ${url}`)
    } else if (process.platform === 'darwin') {
      exec(`open ${url}`)
    } else {
      exec(`xdg-open ${url}`)
    }
  })
}

process.on('SIGINT', () => {
  closeDatabase()
  process.exit(0)
})

start()
