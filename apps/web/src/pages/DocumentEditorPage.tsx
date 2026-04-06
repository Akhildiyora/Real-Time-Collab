import { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { documentService } from '../services/document.service';
import { useQuery } from '@tanstack/react-query';
import { ShareModal } from '../components/ShareModal';
import { 
  ArrowLeft, 
  Share2, 
  X,
  Clock,
  History,
  MessageCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Settings
} from 'lucide-react';
import { CommentSidebar } from '../components/CommentSidebar';
import { commentService } from '../services/comment.service';
import { NeuralEditor } from '../components/editor/NeuralEditor';

// --- Helper for User Visuals ---
function getAvatarColor(email: string) {
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-indigo-400', 'bg-fuchsia-400', 'bg-orange-400'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// --- ErrorBoundary ---
class EditorErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Neural Node Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-8 p-12 border-2 border-dashed border-red-500/10 rounded-[60px] bg-red-500/05 animate-in zoom-in-75 duration-700 shadow-3xl">
           <AlertCircle className="h-16 w-16 text-red-500" />
           <div className="text-center space-y-4">
             <h3 className="font-black text-red-500 text-3xl uppercase tracking-tighter">Vector Surface Disrupted</h3>
             <p className="text-[10px] text-text-muted mt-2 uppercase tracking-[0.4em] font-bold opacity-40 max-w-sm mx-auto leading-loose">{this.state.error?.message || "Sync Protocol Failed (v11)"}</p>
           </div>
           <button onClick={() => window.location.reload()} className="px-14 py-4 mt-4 rounded-3xl bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-all shadow-[0_20px_50px_rgba(239,68,68,0.3)] active:scale-90 tracking-widest">REBOOT TERMINAL</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main DocumentEditorPage ---
export function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isLoading: isAuthLoading, isAuthenticated } = useAuthStore();
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const { data: documentInfo } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.getDocument(id!),
    enabled: !!id,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentService.getComments(id!),
    enabled: !!id && (isCommentsOpen || true), // Always fetch to ensure real-time marks work
  });

  const { data: versions } = useQuery({
    queryKey: ['document-versions', id],
    queryFn: () => documentService.getVersions(id!),
    enabled: !!id && isHistoryOpen,
  });

  // --- v19: Reactive Sync Handler ---
  const handleSyncEvent = useCallback(() => {
    console.log('[Neural Sync] Triggering Reactive Refresh...');
    refetchComments();
  }, [refetchComments]);

  if (isAuthLoading) return <div className="min-h-screen bg-bg flex items-center justify-center animate-in fade-in duration-1000"><Loader2 className="h-12 w-12 animate-spin text-accent opacity-20" /></div>;
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg flex-col gap-10 text-text animate-in zoom-in-75 duration-1000">
        <h2 className="text-5xl font-black tracking-tighter uppercase text-white shadow-[0_0_50px_rgba(0,0,0,0.5)]">Neural Barrier</h2>
        <button onClick={() => navigate('/login')} className="px-16 py-5 bg-accent text-bg rounded-3xl font-black shadow-[0_0_50px_var(--color-accent)] hover:scale-110 active:scale-95 transition-all tracking-[0.2em] animate-pulse">RE-AUTHENTICATE</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text selection:bg-accent/40 font-sans tracking-tight">
      {/* Sidebar - History */}
      {isHistoryOpen && (
        <div className="flex w-96 flex-col border-r border-white/5 bg-bg/85 backdrop-blur-3xl animate-in slide-in-from-left duration-1000 shadow-[20px_0_100px_rgba(0,0,0,0.5)] z-50">
          <div className="flex items-center justify-between border-b border-white/5 p-10 mt-5">
            <h2 className="text-[14px] font-black uppercase tracking-[0.5em] text-accent">Historical Trace</h2>
            <button onClick={() => setIsHistoryOpen(false)} className="text-white/20 hover:text-white transition-all bg-white/5 p-3 rounded-2xl shadow-inner border border-white/5 group"><X className="h-6 w-6 group-hover:rotate-90 transition-transform" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {versions?.map((v: any) => (
              <div key={v.id} className="group rounded-[48px] border border-white/5 p-8 hover:border-accent/40 transition-all cursor-default bg-white/5 shadow-2xl active:scale-[0.98]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-accent uppercase bg-accent/20 px-4 py-2 rounded-full border border-accent/20 shadow-[0_0_15px_rgba(var(--color-accent),0.2)]">V{v.version}</span>
                  <Clock className="h-4 w-4 text-white/5" />
                </div>
                <p className="mt-7 text-[13px] text-text-muted line-clamp-4 leading-relaxed opacity-60 underline decoration-white/5 underline-offset-[12px] decoration-2">"{v.content.slice(0, 150)}..."</p>
                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em] font-mono">{new Date(v.createdAt).toLocaleDateString()}</span>
                  <button className="text-[11px] font-black text-accent opacity-0 group-hover:opacity-100 transition-all hover:bg-accent/10 px-6 py-2.5 rounded-full border border-accent/20">RESTORE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Editor Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-bg/95 px-14 py-8 backdrop-blur-3xl sticky top-0 z-40 shadow-[0_30px_80px_rgba(0,0,0,0.6)] transition-all duration-1000">
          <div className="flex items-center gap-12">
            <button onClick={() => navigate('/')} className="rounded-3xl p-5 text-text-muted hover:bg-white/5 hover:text-accent transition-all ring-1 ring-white/10 hover:ring-accent/40 shadow-3xl active:scale-90 group"><ArrowLeft className="h-6 w-6 group-hover:-translate-x-2 transition-transform" /></button>
            <div className="flex flex-col">
               <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.8em] font-mono">WORKSPACE</span>
                  <ChevronRight className="h-4 w-4 text-white/10" />
                  <h1 className="text-4xl font-black tracking-tighter text-white leading-none">
                    {documentInfo?.title || 'Untitled Vector'}
                  </h1>
                  <div className="h-3 w-3 rounded-full bg-accent animate-pulse shadow-[0_0_25px_var(--color-accent)]" />
               </div>
            </div>
          </div>

          <div className="flex items-center space-x-12">
            <div className="flex items-center gap-6 bg-white/5 p-4 rounded-[36px] ring-1 ring-white/10 shadow-3xl">
               <button onClick={() => setIsCommentsOpen(!isCommentsOpen)} className={`rounded-2xl p-5 transition-all duration-700 hover:scale-110 active:scale-95 ${isCommentsOpen ? 'bg-accent text-bg shadow-[0_0_50px_var(--color-accent)] scale-110' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}><MessageCircle className="h-6 w-6" /></button>
               <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className={`rounded-2xl p-5 transition-all duration-700 hover:scale-110 active:scale-95 ${isHistoryOpen ? 'bg-accent text-bg shadow-[0_0_50px_var(--color-accent)] scale-110' : 'text-text-muted hover:bg-white/10 hover:text-white'}`}><History className="h-6 w-6" /></button>
            </div>

            <button onClick={() => setIsShareModalOpen(true)} className="rounded-2xl bg-white/5 border border-white/10 px-12 py-5 text-[11px] font-black text-white hover:bg-accent hover:border-accent hover:text-bg hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-4 animate-in fade-in shadow-2xl tracking-[0.2em] uppercase group">
              <Share2 className="h-5 w-5 group-hover:rotate-12 transition-transform opacity-40 group-hover:text-bg group-hover:opacity-100" /> 
              Share
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-6 pl-8 border-l border-white/5 ml-4 group cursor-pointer">
               <div className="flex flex-col items-end hidden lg:flex group-hover:translate-x-2 transition-transform duration-500">
                  <span className="text-[11px] font-black text-white uppercase tracking-tighter leading-none group-hover:text-accent transition-colors">{currentUser.email.split('@')[0]}</span>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.5em] leading-none mt-2">ACTIVE_NODE</span>
               </div>
               <div className={`h-16 w-16 rounded-[22px] flex items-center justify-center text-xl font-black text-white shadow-3xl border border-white/10 hover:scale-110 hover:rotate-12 transition-all duration-500 overflow-hidden relative ${getAvatarColor(currentUser.email)}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                  {currentUser.email[0].toUpperCase()}
               </div>
               <button onClick={() => navigate('/settings')} className="p-4 rounded-2xl text-white/10 hover:text-accent hover:bg-accent/10 transition-all border border-transparent hover:border-accent/30"><Settings className="h-5 w-5" /></button>
            </div>
          </div>
        </div>

        {/* Editor Surface - Self-Contained NeuralEditor */}
        <div className="flex-1 overflow-y-auto p-12 md:p-24 bg-bg-canvas/70 relative selection:bg-accent/40">
          <div className="mx-auto max-w-7xl space-y-24 animate-in fade-in slide-in-from-bottom-32 duration-1200">
            <div className="min-h-[85vh] relative rounded-[110px] border border-white/10 bg-bg/95 shadow-[0_120px_300px_rgba(0,0,0,0.85)] transition-all overflow-hidden ring-1 ring-white/5 group backdrop-blur-3xl p-1.5 bg-gradient-to-br from-white/10 via-transparent to-white/5">
               <div className="h-full w-full rounded-[106px] overflow-hidden bg-bg/95 relative">
                  <EditorErrorBoundary>
                     {id && (
                       <NeuralEditor
                         documentId={id}
                         currentUser={currentUser}
                         onAddComment={() => setIsCommentsOpen(true)}
                         onSyncEvent={handleSyncEvent}
                       />
                     )}
                  </EditorErrorBoundary>
               </div>
            </div>

            {/* Futuristic Footer Trace */}
            <div className="flex items-center justify-between px-24 text-[11px] font-black uppercase tracking-[1em] text-white/5 pb-40">
               <div className="flex items-center gap-24">
                  <span className="hover:text-accent transition-all cursor-default hover:tracking-[1.2em] opacity-30">DOC_VECTOR_{id?.slice(0, 14)}</span>
                  <span className="hover:text-accent transition-all cursor-default opacity-20 shadow-[0_0_10px_currentColor]">PHASE_6_FINAL</span>
               </div>
               <div className="flex items-center gap-10 bg-white/5 px-14 py-5 rounded-full ring-1 ring-white/5 shadow-3xl hover:bg-white/10 transition-all group scale-110">
                  <div className="h-2 w-2 rounded-full shadow-[0_0_15px_var(--color-accent)] bg-accent animate-pulse group-hover:scale-150 transition-transform" />
                  <span className="opacity-30 tracking-[0.6em] uppercase font-mono group-hover:opacity-100 transition-opacity">Neural Sync Verified</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {isCommentsOpen && id && (
        <CommentSidebar
          documentId={id}
          comments={comments || []}
          onClose={() => setIsCommentsOpen(false)}
          onRefresh={refetchComments}
        />
      )}

      {isShareModalOpen && id && (
        <ShareModal documentId={id} onClose={() => setIsShareModalOpen(false)} />
      )}
    </div>
  );
}
