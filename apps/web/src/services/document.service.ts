import { useAuthStore } from "../store/auth.store";

export interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

class DocumentService {
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

  async getDocuments(): Promise<Document[]> {
    const res = await fetch(`${this.apiUrl}/documents`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch documents");
    return res.json();
  }

  async getDocument(id: string): Promise<Document> {
    const res = await fetch(`${this.apiUrl}/documents/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch document");
    return res.json();
  }

  async createDocument(title: string): Promise<Document> {
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

  async shareDocument(documentId: string, collaboratorUserId: string, role: string): Promise<any> {
    const res = await fetch(`${this.apiUrl}/documents/${documentId}/share`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ collaboratorUserId, role }),
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
}

export const documentService = new DocumentService();
