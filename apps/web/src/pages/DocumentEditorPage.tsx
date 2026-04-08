import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService, type EditorDocument } from '../services/document.service';
import { commentService, type EditorComment } from '../services/comment.service';
import { useAuthStore } from '../store/auth.store';
import { NeuralEditor } from '../components/editor/NeuralEditor';
import { ShareModal } from '../components/sharing/ShareModal';
import { DocumentNavigation } from '../components/DocumentNavigation';
import { CommentSidebar } from '../components/editor/CommentSidebar';
import { 
  ShieldAlert,
  Loader2
} from 'lucide-react';

export function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved');
  const [isOnline, setIsOnline] = useState(true);

  // 1. Fetch Document (Support sharing token)
  const { data: document, isLoading, error } = useQuery<EditorDocument & { currentUserRole?: string, owner?: { email: string } }>({
    queryKey: ['document', id, shareToken],
    queryFn: () => documentService.getDocument(id!, shareToken || undefined),
    enabled: !!id,
    retry: false
  });

  // 2. Fetch Comments
  const { data: comments = [] } = useQuery<EditorComment[]>({
    queryKey: ['comments', id, shareToken],
    queryFn: () => commentService.getComments(id!, shareToken || undefined),
    enabled: !!id,
    refetchInterval: 5000 
  });

  // 3. Mutations
  const addCommentMutation = useMutation({
    mutationFn: ({ content, anchorData }: { content: string, anchorData: any }) => 
      commentService.createComment(id!, content, anchorData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  const replyMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string, content: string }) =>
      commentService.createReply(commentId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  const resolveMutation = useMutation({
    mutationFn: (commentId: string) => commentService.resolveComment(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string, content: string }) => 
      commentService.updateComment(commentId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  const updateReplyMutation = useMutation({
    mutationFn: ({ replyId, content }: { replyId: string, content: string }) => 
      commentService.updateReply(replyId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });

  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: string) => commentService.deleteReply(replyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] })
  });
  
  // Handlers
  const handleAddComment = useCallback(async (content: string, anchorData: any) => {
    await addCommentMutation.mutateAsync({ content, anchorData });
  }, [id, addCommentMutation]);

  const handleReply = useCallback(async (commentId: string, content: string) => {
    await replyMutation.mutateAsync({ commentId, content });
  }, [id, replyMutation]);

  const handleResolve = useCallback(async (commentId: string) => {
    await resolveMutation.mutateAsync(commentId);
  }, [id, resolveMutation]);

  const handleUpdateComment = useCallback(async (commentId: string, content: string) => {
    await updateCommentMutation.mutateAsync({ commentId, content });
  }, [id, updateCommentMutation]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await deleteCommentMutation.mutateAsync(commentId);
  }, [id, deleteCommentMutation]);

  const handleUpdateReply = useCallback(async (replyId: string, content: string) => {
    await updateReplyMutation.mutateAsync({ replyId, content });
  }, [id, updateReplyMutation]);

  const handleDeleteReply = useCallback(async (replyId: string) => {
    await deleteReplyMutation.mutateAsync(replyId);
  }, [id, deleteReplyMutation]);

  const handleSyncEvent = useCallback((event: any) => {
    if (event?.type === 'SYNC_EVENT' || event?.kind === 'comments' || event?.payload?.kind === 'comments') {
      const type = event?.type || event?.payload?.type;
      if (type?.includes('COMMENT') || type?.includes('REPLY')) {
        queryClient.invalidateQueries({ queryKey: ['comments', id] });
      }
    }
  }, [id, queryClient]);

  // Authenticated check
  useEffect(() => {
    if (!authLoading && !user && !shareToken) {
      navigate('/login');
    }
  }, [user, authLoading, navigate, shareToken]);

  if (isLoading || authLoading) {
    return (
      <div className="h-screen w-full bg-bg flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full animate-pulse" />
          <Loader2 className="h-12 w-12 text-accent animate-spin relative z-10" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="h-screen w-full bg-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-10 text-center backdrop-blur-xl">
          <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShieldAlert className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-text-h mb-4 uppercase tracking-tighter">Access Denied</h1>
          <p className="text-text-muted mb-8 text-sm leading-relaxed">
            The neural link to this document has been severed or you lack the required clearance levels.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-white text-bg py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-all duration-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const userRole = document.currentUserRole || (document.ownerId === user?.id ? 'admin' : 'viewer');

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-bg text-text-h">
      <DocumentNavigation
        title={document.title}
        ownerEmail={document.owner?.email || ''}
        userRole={userRole}
        isCommentsOpen={isCommentsOpen}
        isHistoryOpen={isHistoryOpen}
        onBack={() => navigate('/documents')}
        onToggleComments={() => setIsCommentsOpen((open) => !open)}
        onToggleHistory={() => setIsHistoryOpen((open) => !open)}
        onOpenShare={() => setIsShareModalOpen(true)}
        saveStatus={saveStatus}
        onStatusChange={setSaveStatus}
        isOnline={isOnline}
        documentId={id}
      />

      <main className="flex-1 flex w-full max-w-7xl px-4 sm:px-6 lg:px-10 mx-auto overflow-hidden relative">
        <section className="flex-1 flex flex-col w-full relative overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <NeuralEditor
              documentId={id!}
              initialContent={document.content}
              currentUser={user}
              onAddComment={handleAddComment}
              onSyncEvent={handleSyncEvent}
              userRole={userRole}
              shareToken={shareToken}
              onStatusChange={setSaveStatus}
              onOnlineChange={setIsOnline}
            />
          </div>
        </section>

        {(isCommentsOpen || isHistoryOpen) && (
          <aside className="w-96 hidden lg:flex border-l border-white/5 bg-slate-900/40 backdrop-blur-3xl animate-in slide-in-from-right duration-500">
            {isCommentsOpen && (
              <CommentSidebar
                comments={comments}
                selectedCommentId={null}
                onSelectComment={() => {}}
                onReply={handleReply}
                onResolve={handleResolve}
                onUpdateComment={handleUpdateComment}
                onDeleteComment={handleDeleteComment}
                onUpdateReply={handleUpdateReply}
                onDeleteReply={handleDeleteReply}
                currentUser={user}
              />
            )}
          </aside>
        )}
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={id!}
        documentTitle={document.title}
        ownerEmail={document.owner?.email || ''}
        userRole={userRole}
      />
    </div>
  );
}
