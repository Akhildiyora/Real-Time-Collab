import { useAuthStore } from "../store/auth.store";

export interface Comment {
  id: string;
  body: string;
  author: { email: string };
  anchorData?: any;
  isResolved: boolean;
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  body: string;
  author: { email: string };
  createdAt: string;
}

class CommentService {
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

  async getComments(documentId: string): Promise<Comment[]> {
    const res = await fetch(`${this.apiUrl}/documents/${documentId}/comments`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
  }

  async createComment(documentId: string, body: string, anchorData?: any): Promise<Comment> {
    const res = await fetch(`${this.apiUrl}/documents/${documentId}/comments`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ body, anchorData }),
    });
    if (!res.ok) throw new Error("Failed to create comment");
    return res.json();
  }

  async resolveComment(commentId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/documents/comments/${commentId}/resolve`, {
      method: "PATCH",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to resolve comment");
  }

  async createReply(commentId: string, body: string): Promise<Reply> {
    const res = await fetch(`${this.apiUrl}/documents/comments/${commentId}/replies`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error("Failed to create reply");
    return res.json();
  }
}

export const commentService = new CommentService();
