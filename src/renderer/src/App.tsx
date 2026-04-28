import { useState } from 'react'
import { ConfigProvider, DatePicker } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { TitleBar } from './components/TitleBar/TitleBar'
import { TodoList } from './components/TodoList/TodoList'
import { TodoForm } from './components/TodoForm/TodoForm'
import { useTodos } from './hooks/useTodos'
import { appTheme } from './styles/theme'
import type { Todo } from './types/todo'
import type { TodoFilter } from './types/todo'
import dayjs from 'dayjs'

type StatusTab = 'all' | 'active' | 'completed'

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'completed', label: '已完成' },
]

export default function App(): JSX.Element {
  const { todos, loading, filter, setFilter, createTodo, updateTodo, deleteTodo, toggleTodo } = useTodos()
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const currentStatus: StatusTab = (filter.status as StatusTab) || 'all'

  const handleStatusChange = (status: StatusTab): void => {
    const next: TodoFilter = { ...filter, status: status === 'all' ? undefined : status }
    if (status !== 'completed') {
      delete next.completedDate
    }
    setFilter(next)
  }

  const handleCompletedDateChange = (_: unknown, dateStr: string | string[]): void => {
    const val = Array.isArray(dateStr) ? dateStr[0] : dateStr
    setFilter({ ...filter, completedDate: val || undefined })
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 0', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-card, rgba(255,255,255,0.45))', borderRadius: 8, padding: 2 }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              style={{
                padding: '4px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: currentStatus === tab.key ? 600 : 400,
                background: currentStatus === tab.key ? 'var(--check-color, #a855f7)' : 'transparent',
                color: currentStatus === tab.key ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {currentStatus === 'completed' && (
          <DatePicker
            size="small"
            placeholder="完成日期"
            format="YYYY-MM-DD"
            value={filter.completedDate ? dayjs(filter.completedDate) : null}
            onChange={handleCompletedDateChange}
            allowClear
            style={{ width: 140 }}
          />
        )}
      </div>
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
