import { useAuthStore } from "../store/auth.store";
import { EditorComment } from './comment.service';

export interface EditorDocument {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  userRole?: string;
  comments?: EditorComment[];
  owner?: {
    email: string;
    name?: string;
  };
}

class DocumentService {
  private get apiUrl() {
    return import.meta.env.VITE_API_URL || "http://localhost:3000";
  }

  private getHeaders() {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async getDocuments(): Promise<EditorDocument[]> {
    const res = await fetch(`${this.apiUrl}/documents`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
  }

  async getDocument(id: string, token?: string | null): Promise<EditorDocument> {
    const url = token 
      ? `${this.apiUrl}/documents/${id}?token=${token}` 
      : `${this.apiUrl}/documents/${id}`;
      
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch document");
    return res.json();
  }

  async createDocument(title: string): Promise<EditorDocument> {
    const res = await fetch(`${this.apiUrl}/documents`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error("Failed to create document");
    return res.json();
  }

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/documents/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete document");
  }

  async shareDocument(documentId: string, email: string, role: string): Promise<any> {
    const res = await fetch(`${this.apiUrl}/documents/${documentId}/share`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ email, role }),
    });
    if (!res.ok) throw new Error("Failed to share document");
    return res.json();
  }

  async getVersions(id: string): Promise<any[]> {
    const res = await fetch(`${this.apiUrl}/documents/${id}/versions`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch versions");
    return res.json();
  }

  async updateDocument(id: string, params: { title?: string; content?: string; yjsState?: string }): Promise<EditorDocument> {
    const res = await fetch(`${this.apiUrl}/documents/${id}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error("Failed to update document");
    return res.json();
  }

  async searchDocuments(query: string): Promise<EditorDocument[]> {
    const res = await fetch(`${this.apiUrl}/documents/search?q=${encodeURIComponent(query)}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to search documents");
    return res.json();
  }

  async uploadDocument(file: File): Promise<EditorDocument> {
    const formData = new FormData();
    formData.append("file", file);
    
    // Custom headers because we don't want Content-Type: application/json here (fetch sets it for FormData)
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.apiUrl}/documents/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to upload document");
    }
    return res.json();
  }
}

export const documentService = new DocumentService();
