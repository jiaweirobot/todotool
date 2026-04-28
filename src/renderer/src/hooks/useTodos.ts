import { useState, useEffect, useCallback } from 'react'
import type { Todo, CreateTodoInput, UpdateTodoInput, TodoFilter } from '../types/todo'

const isTauri = '__TAURI_INTERNALS__' in window

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

const API_BASE = window.location.port === '5173' ? 'http://localhost:3456' : ''

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  return res.json()
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TodoFilter>({})

  const fetchTodos = useCallback(async () => {
    try {
      let data: Todo[]
      if (isTauri) {
        data = await tauriInvoke<Todo[]>('get_all_todos', {
          search: filter.search || null,
          urgency: filter.urgency ?? null,
          status: filter.status || null,
          completedDate: filter.completedDate || null,
        })
      } else {
        const params = new URLSearchParams()
        if (filter.search) params.set('search', filter.search)
        if (filter.urgency !== undefined) params.set('urgency', String(filter.urgency))
        if (filter.status) params.set('status', filter.status)
        if (filter.completedDate) params.set('completedDate', filter.completedDate)
        const qs = params.toString()
        data = await api<Todo[]>(`/todos${qs ? '?' + qs : ''}`)
      }
      setTodos(data)
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const createTodo = async (input: CreateTodoInput): Promise<void> => {
    if (isTauri) {
      await tauriInvoke('create_todo', { input })
    } else {
      await api('/todos', { method: 'POST', body: JSON.stringify(input) })
    }
    await fetchTodos()
  }

  const updateTodo = async (id: string, updates: UpdateTodoInput): Promise<void> => {
    if (isTauri) {
      await tauriInvoke('update_todo', { id, input: updates })
    } else {
      await api(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    }
    await fetchTodos()
  }

  const deleteTodo = async (id: string): Promise<void> => {
    if (isTauri) {
      await tauriInvoke('delete_todo', { id })
    } else {
      await api(`/todos/${id}`, { method: 'DELETE' })
    }
    await fetchTodos()
  }

  const toggleTodo = async (id: string): Promise<void> => {
    if (isTauri) {
      await tauriInvoke('toggle_todo', { id })
    } else {
      await api(`/todos/${id}/toggle`, { method: 'PATCH' })
    }
    await fetchTodos()
  }

  return {
    todos,
    loading,
    filter,
    setFilter,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    refresh: fetchTodos
  }
}
