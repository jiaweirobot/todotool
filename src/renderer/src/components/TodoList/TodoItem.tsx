import { Button, Popconfirm } from 'antd'
import { DeleteOutlined, EditOutlined, InfoCircleOutlined, ThunderboltOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { UrgencyLevel } from '../../types/todo'
import type { Todo } from '../../types/todo'
import styles from './TodoList.module.css'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

const URGENCY_STYLES: Record<number, { color: string; label: string; icon: React.ReactNode }> = {
  [UrgencyLevel.Low]: {
    color: 'var(--urgency-low)',
    label: '低',
    icon: <InfoCircleOutlined />,
  },
  [UrgencyLevel.Medium]: {
    color: 'var(--urgency-medium)',
    label: '中',
    icon: <InfoCircleOutlined />,
  },
  [UrgencyLevel.High]: {
    color: 'var(--urgency-high)',
    label: '高',
    icon: <ThunderboltOutlined />,
  },
  [UrgencyLevel.Urgent]: {
    color: 'var(--urgency-urgent)',
    label: '紧急',
    icon: <ExclamationCircleOutlined />,
  },
}

export function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps): JSX.Element {
  const completed = !!todo.completed
  const overdue = !completed && isOverdue(todo.dueDate)
  const urg = URGENCY_STYLES[todo.urgency] || URGENCY_STYLES[0]

  return (
    <div
      className={`${styles.item} ${completed ? styles.itemCompleted : ''}`}
      style={{ '--accent': urg.color } as React.CSSProperties}
    >
      <div className={styles.accentBar} />
      <div className={styles.checkbox} onClick={() => onToggle(todo.id)}>
        {completed ? (
          <div className={styles.checkboxChecked}>
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <div className={styles.checkboxEmpty} />
        )}
      </div>
      <div className={styles.itemContent}>
        <div className={`${styles.itemTitle} ${completed ? styles.titleCompleted : ''}`}>
          {todo.title}
        </div>
        <div className={styles.itemMeta}>
          <span className={styles.urgencyBadge} style={{ color: urg.color }}>
            {urg.icon}
            <span style={{ marginLeft: 3 }}>{urg.label}</span>
          </span>
          {todo.dueDate && (
            <span className={`${styles.dateBadge} ${overdue ? styles.overdue : ''}`}>
              <ClockCircleOutlined />
              <span style={{ marginLeft: 3 }}>{formatDate(todo.dueDate)}</span>
            </span>
          )}
        </div>
      </div>
      <div className={styles.itemActions}>
        {!completed && (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(todo)}
            className={styles.actionBtn}
          />
        )}
        <Popconfirm
          title="删除任务？"
          description="此操作无法撤销"
          onConfirm={() => onDelete(todo.id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            className={styles.actionBtn}
            danger
          />
        </Popconfirm>
      </div>
    </div>
  )
}
