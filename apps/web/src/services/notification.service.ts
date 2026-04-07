import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class NotificationService {
  private get authHeader() {
    const token = localStorage.getItem('accessToken');
    return { Authorization: `Bearer ${token}` };
  }

  async getNotifications() {
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: this.authHeader,
    });
    return response.data;
  }

  async markAsRead(id: string) {
    const response = await axios.patch(`${API_URL}/notifications/${id}/read`, {}, {
      headers: this.authHeader,
    });
    return response.data;
  }
}

export const notificationService = new NotificationService();
