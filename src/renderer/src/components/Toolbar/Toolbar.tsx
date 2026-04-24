import { useState, useRef } from 'react'
import { message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  onQuickAdd: (title: string) => Promise<void>
  onOpenCreate: () => void
}

export function Toolbar({ onQuickAdd, onOpenCreate }: ToolbarProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    setSubmitting(true)
    try {
      await onQuickAdd(trimmed)
      setTitle('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      message.error(`添加失败: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className={styles.bar}>
      <input
        ref={inputRef}
        className={styles.input}
        placeholder="添加新任务..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
      />
      <button
        className={styles.addBtn}
        onClick={handleAdd}
        disabled={submitting}
        title="快速添加 (Enter)"
      >
        <PlusOutlined />
      </button>
      <button
        className={styles.expandBtn}
        onClick={onOpenCreate}
        title="展开详细添加"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
