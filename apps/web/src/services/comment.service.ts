import { useAuthStore } from "../store/auth.store";

export interface EditorComment {
  id: string;
  content: string; // Changed from body
  author: { id: string; email: string };
  anchorData?: any;
  isResolved: boolean;
  createdAt: string;
  replies: EditorCommentReply[];
}

export interface EditorCommentReply {
  id: string;
  content: string; // Changed from body
  author: { id: string; email: string };
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
      "Authorization": `Bearer ${token}`,
    };
  }

  async getComments(documentId: string, shareToken?: string): Promise<EditorComment[]> {
    const url = new URL(`${this.apiUrl}/documents/${documentId}/comments`);
    if (shareToken) url.searchParams.set('token', shareToken);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch comments");
    return res.json();
  }

  async createComment(documentId: string, content: string, anchorData?: any): Promise<EditorComment> {
    const res = await fetch(`${this.apiUrl}/documents/${documentId}/comments`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ content, anchorData }),
    });
    if (!res.ok) throw new Error("Failed to create comment");
    return res.json();
  }

  async updateComment(commentId: string, content: string): Promise<EditorComment> {
    const res = await fetch(`${this.apiUrl}/comments/${commentId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to update comment");
    return res.json();
  }

  async deleteComment(commentId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/comments/${commentId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete comment");
  }

  async resolveComment(commentId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/comments/${commentId}/resolve`, {
      method: "PATCH",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to resolve comment");
  }

  async createReply(commentId: string, content: string): Promise<EditorCommentReply> {
    const res = await fetch(`${this.apiUrl}/comments/${commentId}/replies`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to create reply");
    return res.json();
  }

  async updateReply(replyId: string, content: string): Promise<EditorCommentReply> {
    const res = await fetch(`${this.apiUrl}/comments/replies/${replyId}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to update reply");
    return res.json();
  }

  async deleteReply(replyId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/comments/replies/${replyId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete reply");
  }
}

export const commentService = new CommentService();
