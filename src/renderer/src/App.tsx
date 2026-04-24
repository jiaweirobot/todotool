import { useState } from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { TitleBar } from './components/TitleBar/TitleBar'
import { TodoList } from './components/TodoList/TodoList'
import { TodoForm } from './components/TodoForm/TodoForm'
import { useTodos } from './hooks/useTodos'
import { appTheme } from './styles/theme'
import type { Todo } from './types/todo'

export default function App(): JSX.Element {
  const { todos, loading, createTodo, updateTodo, deleteTodo, toggleTodo } = useTodos()
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const handleOpenCreate = (): void => {
    setEditingTodo(null)
    setFormOpen(true)
  }

  const handleEdit = (todo: Todo): void => {
    setEditingTodo(todo)
    setFormOpen(true)
  }

  const handleCloseForm = (): void => {
    setEditingTodo(null)
    setFormOpen(false)
  }

  return (
    <ConfigProvider theme={appTheme} locale={zhCN}>
      <TitleBar onAdd={handleOpenCreate} />
      <TodoList
        todos={todos}
        loading={loading}
        onToggle={toggleTodo}
        onEdit={handleEdit}
        onDelete={deleteTodo}
      />
      <TodoForm
        open={formOpen}
        editingTodo={editingTodo}
        onClose={handleCloseForm}
        onCreate={createTodo}
        onUpdate={updateTodo}
      />
    </ConfigProvider>
  )
}
