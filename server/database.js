const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

let db = null
let dbPath

function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function toCamelCase(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: !!row.completed,
    urgency: row.urgency,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null,
    sortOrder: row.sort_order
  }
}

async function initDatabase() {
  const dataDir = path.join(process.env.APPDATA || path.join(require('os').homedir(), '.config'), 'todotool')
  fs.mkdirSync(dataDir, { recursive: true })
  dbPath = path.join(dataDir, 'todos.db')

  const SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      urgency INTEGER DEFAULT 0,
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      sort_order INTEGER DEFAULT 0
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  try {
    db.run('ALTER TABLE todos ADD COLUMN completed_at TEXT')
  } catch (_) {}

  saveDatabase()
}

function getAllTodos(filter) {
  if (!db) return []

  let sql = 'SELECT * FROM todos WHERE 1=1'
  const params = []

  if (filter && filter.search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)'
    const term = `%${filter.search}%`
    params.push(term, term)
  }

  if (filter && filter.urgency !== undefined && filter.urgency >= 0) {
    sql += ' AND urgency = ?'
    params.push(filter.urgency)
  }

  if (filter && filter.status === 'active') {
    sql += ' AND completed = 0'
  } else if (filter && filter.status === 'completed') {
    sql += ' AND completed = 1'
  }

  sql += ' ORDER BY completed ASC, urgency DESC, created_at DESC'

  const stmt = db.prepare(sql)
  if (params.length > 0) {
    stmt.bind(params)
  }

  const todos = []
  while (stmt.step()) {
    todos.push(toCamelCase(stmt.getAsObject()))
  }
  stmt.free()
  return todos
}

function createTodo(input) {
  if (!db) throw new Error('Database not initialized')

  const now = new Date().toISOString()
  const id = uuidv4()

  db.run(
    `INSERT INTO todos (id, title, description, completed, urgency, due_date, created_at, updated_at, completed_at, sort_order)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, NULL, 0)`,
    [id, input.title, input.description || '', input.urgency ?? 0, input.dueDate || null, now, now]
  )

  saveDatabase()
  return toCamelCase({
    id, title: input.title, description: input.description || '',
    completed: 0, urgency: input.urgency ?? 0, due_date: input.dueDate || null,
    created_at: now, updated_at: now, completed_at: null, sort_order: 0
  })
}

function updateTodo(id, updates) {
  if (!db) throw new Error('Database not initialized')

  const fields = []
  const params = []

  if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title) }
  if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description) }
  if (updates.urgency !== undefined) { fields.push('urgency = ?'); params.push(updates.urgency) }
  if (updates.dueDate !== undefined) { fields.push('due_date = ?'); params.push(updates.dueDate) }
  if (updates.completed !== undefined) { fields.push('completed = ?'); params.push(updates.completed ? 1 : 0) }
  if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); params.push(updates.sortOrder) }

  if (fields.length === 0) return null

  fields.push('updated_at = ?')
  params.push(new Date().toISOString())
  params.push(id)

  db.run(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, params)
  saveDatabase()

  const stmt = db.prepare('SELECT * FROM todos WHERE id = ?')
  stmt.bind([id])
  let todo = null
  if (stmt.step()) {
    todo = toCamelCase(stmt.getAsObject())
  }
  stmt.free()
  return todo
}

function deleteTodo(id) {
  if (!db) throw new Error('Database not initialized')
  db.run('DELETE FROM todos WHERE id = ?', [id])
  saveDatabase()
  return true
}

function toggleTodoCompleted(id) {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT completed FROM todos WHERE id = ?')
  stmt.bind([id])
  let currentCompleted = 0
  if (stmt.step()) {
    currentCompleted = stmt.getAsObject().completed
  }
  stmt.free()

  const newCompleted = currentCompleted ? 0 : 1
  const now = new Date().toISOString()
  const completedAt = newCompleted ? now : null

  db.run('UPDATE todos SET completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
    [newCompleted, completedAt, now, id])
  saveDatabase()

  const stmt2 = db.prepare('SELECT * FROM todos WHERE id = ?')
  stmt2.bind([id])
  let todo = null
  if (stmt2.step()) {
    todo = toCamelCase(stmt2.getAsObject())
  }
  stmt2.free()
  return todo
}

function getSetting(key) {
  if (!db) return undefined
  const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?')
  stmt.bind([key])
  let value
  if (stmt.step()) {
    value = stmt.getAsObject().value
  }
  stmt.free()
  return value
}

function setSetting(key, value) {
  if (!db) return
  db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value])
  saveDatabase()
}

function closeDatabase() {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

module.exports = {
  initDatabase,
  getAllTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodoCompleted,
  getSetting,
  setSetting,
  closeDatabase
}
