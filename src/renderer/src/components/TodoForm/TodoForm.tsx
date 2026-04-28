import { useEffect, useState } from 'react'
import { Modal, Form, Input, DatePicker, message } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { UrgencyLevel } from '../../types/todo'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '../../types/todo'
import styles from './TodoForm.module.css'
import dayjs from 'dayjs'

interface TodoFormProps {
  open: boolean
  editingTodo: Todo | null
  onClose: () => void
  onCreate: (input: CreateTodoInput) => Promise<void>
  onUpdate: (id: string, updates: UpdateTodoInput) => Promise<void>
}

const urgencyLevels = [
  { value: UrgencyLevel.Low, label: '低', color: 'var(--urgency-low)' },
  { value: UrgencyLevel.Medium, label: '中', color: 'var(--urgency-medium)' },
  { value: UrgencyLevel.High, label: '高', color: 'var(--urgency-high)' },
]

export function TodoForm({ open, editingTodo, onClose, onCreate, onUpdate }: TodoFormProps): JSX.Element {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [urgency, setUrgency] = useState(UrgencyLevel.Medium)
  const isEdit = !!editingTodo

  useEffect(() => {
    if (open && editingTodo) {
      form.setFieldsValue({
        title: editingTodo.title,
        description: editingTodo.description,
        dueDate: editingTodo.dueDate ? dayjs(editingTodo.dueDate) : null,
        completedAt: editingTodo.completedAt ? dayjs(editingTodo.completedAt) : null,
      })
      setUrgency(editingTodo.urgency)
    } else if (open) {
      form.resetFields()
      form.setFieldsValue({ dueDate: dayjs() })
      setUrgency(UrgencyLevel.Medium)
    }
  }, [open, editingTodo, form])

  const handleOk = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (isEdit && editingTodo) {
        const updates: UpdateTodoInput = {
          title: values.title.trim(),
          description: values.description?.trim() || '',
          urgency,
          dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        }
        if (editingTodo.completed) {
          updates.completedAt = values.completedAt ? values.completedAt.toISOString() : null
        }
        await onUpdate(editingTodo.id, updates)
      } else {
        await onCreate({
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          urgency,
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined
        })
      }
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      console.error(err)
      message.error(isEdit ? '更新失败' : '添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEdit ? '编辑任务' : '新建任务'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? '保存' : '添加'}
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
      width={360}
    >
      <Form form={form} layout="vertical" className={styles.form}>
        <Form.Item
          name="title"
          label="任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input
            placeholder="做什么..."
            className={styles.input}
          />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea
            rows={2}
            maxLength={500}
            placeholder="补充说明（可选）"
            className={styles.textarea}
          />
        </Form.Item>

        <Form.Item label="优先级">
          <div className={styles.urgencyGroup}>
            {urgencyLevels.map(lvl => (
              <button
                key={lvl.value}
                type="button"
                className={`${styles.urgencyBtn} ${urgency === lvl.value ? styles.urgencyActive : ''}`}
                style={urgency === lvl.value ? { background: lvl.color, borderColor: lvl.color } as React.CSSProperties : undefined}
                onClick={() => setUrgency(lvl.value)}
              >
                {lvl.value === UrgencyLevel.High && <ThunderboltOutlined style={{ marginRight: 3 }} />}
                {lvl.label}
              </button>
            ))}
          </div>
        </Form.Item>

        <Form.Item name="dueDate" label="截止日期">
          <DatePicker
            placeholder="选择日期"
            style={{ width: '100%' }}
            format="YYYY/MM/DD"
            className={styles.datePicker}
          />
        </Form.Item>

        {isEdit && editingTodo?.completed && (
          <Form.Item name="completedAt" label="完成时间">
            <DatePicker
              showTime
              placeholder="选择完成时间"
              style={{ width: '100%' }}
              format="YYYY/MM/DD HH:mm"
              className={styles.datePicker}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
