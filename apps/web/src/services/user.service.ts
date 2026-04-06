import { useAuthStore } from "../store/auth.store";

export interface UserSearch {
  id: string;
  email: string;
}

class UserService {
  private get apiUrl() {
    return import.meta.env.VITE_API_URL || "http://localhost:3000";
  }

  private getHeaders() {
    const token = useAuthStore.getState().accessToken;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async searchUsers(query: string): Promise<UserSearch[]> {
    if (query.length < 2) return [];
    const res = await fetch(`${this.apiUrl}/users/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to search users");
    return res.json();
  }
}

export const userService = new UserService();
