import { ENDPOINTS } from '../api/endpoints.js';
import axiosClient from '../api/axiosClient.js';

export async function getNotifications(params = {}) {
  const { data } = await axiosClient.get(ENDPOINTS.notifications.base, { params });
  return {
    data: data.data || [],
    unreadCount: data.unreadCount || 0,
  };
}

export async function markNotificationAsRead(id) {
  const { data } = await axiosClient.post(ENDPOINTS.notifications.markRead(id));
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await axiosClient.post(ENDPOINTS.notifications.markAllRead);
  return data;
}
