import { request } from '@/api/client'
import type { Announcement } from '../types/communication'

export function fetchPublicAnnouncements() {
  return request<Announcement[]>('/announcements')
}
