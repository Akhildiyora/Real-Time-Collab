import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../services/document.service';
import type { EditorDocument as Document } from '../services/document.service';
import { useAuthStore } from '../store/auth.store';
import { Plus, FileText, Trash2, Clock, Users, ArrowRight, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', debouncedSearch],
    queryFn: () => debouncedSearch 
      ? documentService.searchDocuments(debouncedSearch) 
      : documentService.getDocuments(),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => documentService.createDocument(title),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/documents/${doc.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentService.uploadDocument(file),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate(`/documents/${doc.id}`);
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to upload document');
    }
  });

  const handleCreate = () => {
    const title = prompt('Enter document title:', 'Untitled Document');
    if (title) {
      createMutation.mutate(title);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="space-y-10 animate-in fade-in max-w-7xl mx-auto duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="flex-1 max-w-2xl">
          <div className="text-2xl font-black tracking-tight text-text-h sm:text-3xl">
            My Documents
          </div>
          <p className="mt-2 text-lg text-text">
            Manage and collaborate on your real-time documents.
          </p>
          
          <div className="mt-8 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text/40 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search documents by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-bg border border-border rounded-2xl shadow-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-text/30 text-text-h font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-accent/10 rounded-full text-text/40 hover:text-accent transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg px-6 py-4 text-base font-bold text-text-h transition-all hover:bg-text/5 hover:border-accent/40 active:scale-[0.98] h-fit">
            <Plus className="h-5 w-5 rotate-45 text-accent" />
            Upload Local
            <input 
              type="file" 
              className="hidden" 
              accept=".txt,.pdf,.docx"
              onChange={handleFileUpload}
              disabled={uploadMutation.isPending}
            />
          </label>

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-8 py-4 text-base font-bold text-white shadow-xl shadow-accent/20 transition-all hover:bg-accent/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 h-fit"
          >
            <Plus className="h-5 w-5" />
            New Document
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-accent-bg/5" />
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc: Document) => (
            <div
              key={doc.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-bg p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-xl hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-accent/10 p-2.5 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                  <FileText className="h-6 w-6" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this document?')) deleteMutation.mutate(doc.id);
                  }}
                  className="rounded-md p-1.5 text-text/40 hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4">
                <h3 className="text-xl font-bold text-text-h line-clamp-1">{doc.title}</h3>
                <div className="mt-3 flex items-center gap-4 text-xs font-medium text-text">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {doc.ownerId === user?.id ? 'Owner' : 'Collaborator'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-accent group-hover:gap-3 transition-all"
              >
                Open document <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-accent-bg/5 py-20 text-center">
          <div className="rounded-full bg-accent/10 p-5 text-accent shadow-inner">
            <Plus className="h-10 w-10" />
          </div>
          <h3 className="mt-6 text-2xl font-bold text-text-h">No documents yet</h3>
          <p className="mt-2 text-text">Create your first collaborative document to get started.</p>
          <button
            onClick={handleCreate}
            className="mt-8 rounded-xl bg-accent px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all"
          >
            Create first document
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
