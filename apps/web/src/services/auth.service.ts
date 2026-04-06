const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface User {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user?: User;
}

class AuthService {
  private accessToken: string | null = localStorage.getItem("accessToken");

  get isAuthenticated() {
    return !!this.accessToken;
  }

  setToken(token: string) {
    this.accessToken = token;
    localStorage.setItem("accessToken", token);
  }

  setRefreshToken(token: string) {
    localStorage.setItem("refreshToken", token);
  }

  getToken() {
    return this.accessToken;
  }

  async signup(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Signup failed");
    }

    return res.json();
  }

  async signin(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Signin failed");
    }

    const data: AuthResponse = await res.json();
    this.setToken(data.accessToken);
    this.setRefreshToken(data.refreshToken);
    return data;
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch user");
    }

    const { user } = await res.json();
    return user;
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }
}

export const authService = new AuthService();
