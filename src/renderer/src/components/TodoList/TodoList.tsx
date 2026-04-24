import { Spin } from 'antd'
import { TodoItem } from './TodoItem'
import type { Todo } from '../../types/todo'
import styles from './TodoList.module.css'

interface TodoListProps {
  todos: Todo[]
  loading: boolean
  onToggle: (id: string) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
}

export function TodoList({ todos, loading, onToggle, onEdit, onDelete }: TodoListProps): JSX.Element {
  if (loading) {
    return (
      <div className={styles.center}>
        <Spin size="large" />
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className={styles.center}>
        <div className={styles.emptyIcon}>📝</div>
        <div className={styles.emptyText}>还没有任务</div>
        <div className={styles.emptyText} style={{ opacity: 0.5, fontSize: 11 }}>
          在上方输入框添加你的第一个任务
        </div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
