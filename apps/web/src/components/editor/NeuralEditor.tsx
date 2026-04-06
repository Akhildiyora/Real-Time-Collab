import { useEffect, useState, useRef, useCallback } from 'react';
import { EditorContent, Editor, ReactRenderer } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Collaboration } from '@tiptap/extension-collaboration';
import { Mention } from '@tiptap/extension-mention';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { CommentExtension } from './CommentExtension';
import { MentionList } from './MentionList';
import { commentService } from '../../services/comment.service';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  MessageCircle, 
  Loader2, 
  AlertCircle,
  Users,
  Terminal,
  Activity,
  ArrowRight
} from 'lucide-react';

interface NeuralEditorProps {
  documentId: string;
  currentUser: { email: string };
  onAddComment: () => void;
  onSyncEvent?: () => void;
}

function getUserColor(email: string) {
  const colors = ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#f472b6', '#c084fc', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function NeuralEditor({ documentId, currentUser, onAddComment, onSyncEvent }: NeuralEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SYNC' | 'READY' | 'CRASHED'>('IDLE');
  const [wsError, setWsError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const engineRef = useRef<{ 
    ydoc: Y.Doc | null; 
    provider: WebsocketProvider | null; 
    editor: Editor | null 
  } | null>(null);

  const handleCreateComment = useCallback(async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const body = window.prompt("Capture Neural Signal:");
    if (!body?.trim()) return;

    setIsRefreshing(true);
    try {
      const type = engineRef.current?.ydoc?.getXmlFragment('default');
      if (!type) throw new Error("Sync Handshake Failed");
      
      const anchor = Y.createRelativePositionFromTypeIndex(type, from);
      const head = Y.createRelativePositionFromTypeIndex(type, to);

      const comment = await commentService.createComment(documentId, body, {
        anchor: Y.encodeRelativePosition(anchor),
        head: Y.encodeRelativePosition(head)
      });

      editor.chain().setMark('comment', { commentId: comment.id }).run();
      if (onSyncEvent) onSyncEvent();
      onAddComment();
    } catch (e: any) {
      console.error("[CATASTROPHIC] Anchor Failure:", e);
    } finally { setIsRefreshing(false); }
  }, [editor, documentId, onAddComment, onSyncEvent]);

  useEffect(() => {
    let isMounted = true;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const token = localStorage.getItem('accessToken');

    if (!token) {
       setWsError("Unauthorized Pipeline");
       setStatus('CRASHED');
       return;
    }

    if (engineRef.current) return;

    console.log('[Neural Sync] Initializing v25 (Filtered Kit)...');
    setStatus('SYNC');

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc, { params: { token } });
    engineRef.current = { ydoc, provider, editor: null };

    const handleWsMessage = (event: MessageEvent) => {
       try {
         const data = JSON.parse(event.data);
         if (data.type === 'SYNC_EVENT' && onSyncEvent) onSyncEvent();
       } catch { /* Silent */ }
    };
    provider.ws?.addEventListener('message', handleWsMessage);

    provider.on('status', (event: any) => {
      if (!isMounted) return;
      if (event.status === 'connected') {
        setWsError(null);
        provider.awareness.setLocalStateField('user', {
          name: currentUser.email.split('@')[0] || 'Anonymous',
          color: getUserColor(currentUser.email),
        });

        if (!engineRef.current?.editor && isMounted) {
           try {
             const editorInstance = new Editor({
               extensions: [
                 // --- v25 Filtered StarterKit ---
                 // We specifically disable history, gapcursor, and dropcursor in StarterKit 
                 // to prevent collisions with Collaboration and our custom schema logic.
                 StarterKit.configure({
                   history: false,
                   gapcursor: false,
                   dropcursor: false,
                 }),
                 Collaboration.configure({ document: ydoc }),
                 CommentExtension,
                 Mention.configure({
                   HTMLAttributes: { class: 'bg-accent/20 text-accent px-1.5 py-0.5 rounded-md font-black shadow-glow' },
                   suggestion: {
                     items: ({ query }: { query: string }) => {
                       const states = Array.from(provider.awareness.getStates().values());
                       const collaborators = states
                         .filter((s: any) => s.user)
                         .map((s: any) => ({ id: s.user.name, label: s.user.name }));
                       return collaborators.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));
                     },
                     render: () => {
                       let component: ReactRenderer | null = null;
                       return {
                         onStart: (props: any) => {
                           component = new ReactRenderer(MentionList, { props, editor: props.editor });
                         },
                         onUpdate(props: any) { component?.updateProps(props) },
                         onKeyDown(props: any) {
                           if (props.event.key === 'Escape') { component?.destroy(); return true }
                           return (component?.ref as any)?.onKeyDown?.(props)
                         },
                         onExit() { component?.destroy() },
                       }
                     },
                   }
                 }),
               ],
               editorProps: {
                 attributes: { class: 'prose prose-invert max-w-none focus:outline-none min-h-[800px] outline-none border-0 caret-accent selection:bg-accent/30' },
               },
               immediatelyRender: false,
               onCreate: () => {
                 if (isMounted) {
                   engineRef.current!.editor = editorInstance;
                   setEditor(editorInstance);
                   setStatus('READY');
                   console.log('[Neural Sync] v25 Operational');
                 }
               }
             });
           } catch (e: any) {
             console.error("[CATASTROPHIC] v25 Engine Crash:", e);
             setWsError(`Surface Collision: ${e.message}`);
             setStatus('CRASHED');
           }
        }
      }
    });

    const handleAwareness = () => {
      if (!isMounted || !provider) return;
      const states = Array.from(provider.awareness.getStates().values());
      const users = states.filter((s: any) => s.user).map((s: any) => s.user);
      setActiveUsers(Array.from(new Map(users.map(u => [u.name, u])).values()));
    };
    provider.awareness.on('change', handleAwareness);

    return () => {
      isMounted = false;
      provider.ws?.removeEventListener('message', handleWsMessage);
      if (engineRef.current?.editor) engineRef.current.editor.destroy();
      if (engineRef.current?.provider) engineRef.current.provider.destroy();
      if (engineRef.current?.ydoc) engineRef.current.ydoc.destroy();
      engineRef.current = null;
    };
  }, [documentId, currentUser.email, onAddComment, onSyncEvent]);

  return (
    <div className="flex-1 flex flex-col min-h-[85vh] relative bg-bg selection:bg-accent/40 selection:text-bg">
      {/* Handshake Display */}
      {status !== 'READY' && status !== 'CRASHED' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-14 z-50 bg-bg transition-opacity duration-1500 text-center">
           <div className="relative scale-[4]">
              <div className="absolute inset-[-20px] border border-accent/10 rounded-full animate-[spin_15s_linear_infinite]" />
              <div className="absolute inset-[-10px] border border-white/5 rounded-full animate-[spin_8s_linear_reverse_infinite]" />
              <Loader2 className="h-10 w-10 animate-spin text-accent opacity-5" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="h-2 w-2 rounded-full bg-accent animate-ping shadow-[0_0_20px_var(--color-accent)]" />
              </div>
           </div>
           <div className="text-center space-y-4">
              <p className="text-[14px] font-black uppercase tracking-[1.5em] text-accent/80 animate-pulse">Sync Pipeline v25</p>
              <p className="text-[10px] text-white/20 font-black tracking-[0.5em] uppercase">Binding Filtered Neural Core...</p>
           </div>
        </div>
      )}

      {status === 'CRASHED' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-12 z-50 bg-bg text-center p-20 backdrop-blur-3xl m-2 rounded-[120px] border border-red-500/10 transition-all duration-1000 animate-in zoom-in-75">
           <AlertCircle className="h-32 w-32 text-red-500/10" />
           <div className="space-y-4">
             <h3 className="text-red-500 font-black text-6xl uppercase tracking-tighter leading-none">Sync Collision</h3>
             <p className="text-[11px] text-text-muted uppercase tracking-[0.8em] font-bold opacity-60 leading-relaxed max-w-sm mx-auto mt-8">{wsError}</p>
           </div>
           <button onClick={() => window.location.reload()} className="px-24 py-8 mt-12 bg-red-500 text-white rounded-[60px] font-black shadow-4xl hover:scale-110 active:scale-95 transition-all outline-none flex items-center gap-4 group">
             RE-BOOT VECTOR ENGINE
             <ArrowRight className="h-6 w-6 group-hover:translate-x-4 transition-transform" />
           </button>
        </div>
      )}

      {/* Surface Interface */}
      <div className={`flex-1 flex flex-col transition-all duration-2000 ${editor ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-80 blur-3xl scale-95'}`}>
         {/* Status Header */}
         <div className="flex items-center justify-between border-b border-white/5 bg-white/05 px-14 py-11 backdrop-blur-3xl shadow-[0_30px_160px_rgba(0,0,0,0.8)] sticky top-0 z-50">
            <div className="flex items-center gap-7 bg-accent/20 px-12 py-5 rounded-full border border-accent/20 group cursor-default shadow-[0_0_50px_rgba(var(--color-accent),0.15)] transition-all">
               <Activity className="h-5 w-5 text-accent animate-pulse" />
               <span className="text-[14px] font-black uppercase tracking-[0.8em] text-accent group-hover:tracking-[1em] transition-all">Phase 6 Operational</span>
            </div>
            
            <div className="flex items-center gap-16">
              <div className="flex -space-x-8">
                {activeUsers.map((u, i) => (
                  <div key={i} className="h-16 w-16 rounded-full border-4 border-bg flex items-center justify-center text-[12px] font-black text-white hover:scale-150 hover:z-50 transition-all shadow-4xl ring-1 ring-white/10" style={{ backgroundColor: u.color }} title={u.name}>{u.name[0]}</div>
                ))}
                {activeUsers.length === 0 && (
                   <div className="h-16 w-16 rounded-full border-4 border-bg bg-white/5 flex items-center justify-center text-white/5 shadow-2xl transition-opacity"><Users className="h-7 w-7" /></div>
                )}
              </div>
              <div className="h-16 w-[1px] bg-white/10" />
              <div className="flex gap-2.5 p-2 bg-gradient-to-br from-white/10 to-transparent rounded-[48px] border border-white/10 shadow-3xl ring-1 ring-white/5 transition-all">
                 <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-5 rounded-2xl transition-all duration-500 ${editor?.isActive('heading', { level: 1 }) ? 'bg-accent text-bg shadow-[0_0_60px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}><Heading1 className="h-7 w-7" /></button>
                 <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-5 rounded-2xl transition-all duration-500 ${editor?.isActive('heading', { level: 2 }) ? 'bg-accent text-bg shadow-[0_0_60px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}><Heading2 className="h-7 w-7" /></button>
                 <div className="w-[1px] h-12 bg-white/10 my-auto mx-3" />
                 <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-5 rounded-2xl transition-all duration-500 ${editor?.isActive('bold') ? 'bg-accent text-bg shadow-[0_0_60px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}><Bold className="h-7 w-7" /></button>
                 <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-5 rounded-2xl transition-all duration-500 ${editor?.isActive('italic') ? 'bg-accent text-bg shadow-[0_0_60px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text-muted hover:text-white'}`}><Italic className="h-7 w-7" /></button>
                 <div className="w-[1px] h-12 bg-white/10 my-auto mx-3" />
                 <button 
                  onClick={handleCreateComment} 
                  disabled={isRefreshing}
                  className={`p-5 rounded-2xl transition-all hover:bg-accent/20 hover:text-accent text-text-muted group relative shadow-2xl ${isRefreshing ? 'opacity-40 pointer-events-none' : ''}`}
                 >
                   {isRefreshing ? <Loader2 className="h-8 w-8 animate-spin" /> : <MessageCircle className="h-8 w-8 group-hover:scale-125 transition-all outline-none" />}
                   <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-bg border border-white/10 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-accent opacity-0 group-hover:opacity-100 transition-all shadow-4xl pointer-events-none translate-y-4 group-hover:translate-y-0">Anchor signal</div>
                 </button>
              </div>
            </div>
         </div>

         <div className="flex-1 p-24 md:p-72 lg:p-96 overflow-y-auto selection:bg-accent/40 scrollbar-hide scroll-smooth">
            <EditorContent editor={editor} className="bg-transparent" />
            <div className="mt-80 pt-40 border-t border-white/5 opacity-5 flex flex-col items-center justify-center gap-14 select-none group-hover:opacity-15 transition-opacity duration-3000 grayscale hover:grayscale-0">
               <div className="flex items-center gap-14">
                  <Terminal className="h-8 w-8" />
                  <span className="text-[15px] font-black uppercase tracking-[2.5em] ml-[2.5em]">VECTOR_ENGINE_v25</span>
                  <div className="h-3 w-3 rounded-full bg-accent animate-ping shadow-[0_0_25px_var(--color-accent)]" />
               </div>
               <p className="text-[11px] tracking-[0.6em] font-mono leading-loose max-w-4xl text-center opacity-30 px-12">STABLE_TRACE_LOG::ESTABLISHED::FILTERED_KIT_V25</p>
            </div>
         </div>
      </div>
    </div>
  );
}
