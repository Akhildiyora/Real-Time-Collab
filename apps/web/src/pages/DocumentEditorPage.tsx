import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService, type EditorDocument } from '../services/document.service';
import { commentService, type EditorComment } from '../services/comment.service';
import { useAuthStore } from '../store/auth.store';
import { NeuralEditor } from '../components/editor/NeuralEditor';
import { ShareModal } from '../components/sharing/ShareModal';
import { 
  ArrowLeft, 
  Share2, 
  History, 
  MessageSquare, 
  ChevronRight,
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

  // 1. Fetch Document (Support sharing token)
  const { data: document, isLoading, error } = useQuery<EditorDocument & { currentUserRole?: string }>({
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
    refetchInterval: 5000 // Poll for new comments if WS is sync-only
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
  
  // Memoized handlers to prevent NeuralEditor re-mounts
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

  // Authenticated check: Skip if we have a valid share token
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
    <div className="h-screen w-full bg-bg flex flex-col overflow-hidden text-text-h">
      {/* Neural Navigation Shell */}
      <header className="min-h-[5rem] py-3 border-b border-white/5 bg-bg/80 backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between px-6 md:px-8 z-30 shrink-0 gap-4 md:gap-0">
        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
          <button 
            onClick={() => navigate('/dashboard')}
            title="Return to Dashboard"
            className="p-3 rounded-2xl hover:bg-white/5 text-text-muted hover:text-accent transition-all duration-300 group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          
          <div className="h-10 w-[1px] bg-white/10 hidden md:block" />
          
          <div className="flex-1 md:flex-none truncate">
            <div className="flex items-center gap-2 mb-0.5 truncate">
              <h1 className="text-base md:text-lg font-black tracking-tight leading-none truncate">{document.title}</h1>
              <div className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 flex items-center gap-1 shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[9px] md:text-[10px] font-black text-accent uppercase tracking-tighter">Live</span>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2 text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest truncate">
              <span className="truncate max-w-[100px] md:max-w-none">{document.owner?.email}</span>
              <ChevronRight className="h-3 w-3 opacity-30 shrink-0" />
              <span className="text-accent/70 shrink-0">{userRole}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full md:w-auto border-t border-white/5 pt-3 md:pt-0 md:border-t-0">
          <div className="flex -space-x-2 mr-2 md:mr-4">
             {/* Collaborative Avatars Placeholder */}
             <div className="h-8 w-8 rounded-full border-2 border-bg bg-accent/20 flex items-center justify-center text-[10px] font-black ring-1 ring-white/5" title="You">{user?.email?.[0].toUpperCase()}</div>
             <div className="h-8 w-8 rounded-full border-2 border-bg bg-blue-500/20 flex items-center justify-center text-[10px] font-black ring-1 ring-white/5" title="3 other active collaborators">+3</div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              title="View History & Timeline"
              className={`p-3 rounded-2xl transition-all duration-500 ${isHistoryOpen ? 'bg-accent text-white shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]' : 'hover:bg-white/5 text-text-muted hover:text-accent'}`}
            >
              <History className="h-5 w-5" />
            </button>
            
            <button 
              onClick={() => setIsCommentsOpen(!isCommentsOpen)}
              title="Toggle Neural Feedback"
              className={`p-3 rounded-2xl transition-all duration-500 ${isCommentsOpen ? 'bg-accent text-white shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]' : 'hover:bg-white/5 text-text-muted hover:text-accent'}`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
  
            {userRole === 'admin' && (
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="bg-white text-bg px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest hover:bg-accent hover:text-white transition-all duration-300 flex items-center gap-2 shadow-2xl active:scale-95"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Secure Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex overflow-hidden relative">
        <NeuralEditor
          documentId={id!}
          currentUser={user}
          comments={comments}
          onAddComment={handleAddComment}
          onReply={handleReply}
          onResolve={handleResolve}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onUpdateReply={handleUpdateReply}
          onDeleteReply={handleDeleteReply}
          onSyncEvent={handleSyncEvent}
          userRole={userRole}
          shareToken={shareToken}
        />
      </main>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentId={id!}
        documentTitle={document.title}
        ownerEmail={document.owner?.email || ''}
      />
    </div>
  );
}
