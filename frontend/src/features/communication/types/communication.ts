export interface Announcement {
  id: string
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  priority?: string
  targetType?: string
  targetId?: string
  createdBy?: string
  createdByName?: string
  expiresAt?: string
  pinned?: boolean
  createdAt?: string
}

export interface Notification {
  id: string
  type: string
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  ref?: { kind: string; id: string }
  recipientId?: string
  readAt?: string
  createdAt?: string
}

export interface AdminNotificationsResponse {
  items: Notification[]
  unreadCount: number
}

export interface EmployeeNotificationsResponse {
  items: Notification[]
  unreadCount: number
}
