export interface Todo {
  id: string
  title: string
  description: string
  completed: boolean
  urgency: number
  dueDate: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  sortOrder: number
}

export interface CreateTodoInput {
  title: string
  description?: string
  urgency?: number
  dueDate?: string | null
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  urgency?: number
  dueDate?: string | null
  completed?: boolean
  completedAt?: string | null
  sortOrder?: number
}

export interface TodoFilter {
  search?: string
  urgency?: number
  status?: 'all' | 'active' | 'completed'
  completedDate?: string
}

export enum UrgencyLevel {
  Low = 0,
  Medium = 1,
  High = 2,
  Urgent = 3
}

export const URGENCY_CONFIG = {
  [UrgencyLevel.Low]: { label: '低', color: '#52c41a', tagColor: 'green' },
  [UrgencyLevel.Medium]: { label: '中', color: '#1890ff', tagColor: 'blue' },
  [UrgencyLevel.High]: { label: '高', color: '#fa8c16', tagColor: 'orange' },
  [UrgencyLevel.Urgent]: { label: '紧急', color: '#f5222d', tagColor: 'red' }
} as const
