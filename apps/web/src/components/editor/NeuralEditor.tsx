import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEditor, EditorContent, ReactRenderer, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import debounce from 'lodash/debounce';
import tippy from 'tippy.js';
import { CommentSidebar } from './CommentSidebar';
import { NeuralSelectionCallback } from './NeuralSelectionCallback';
import { MentionList } from './MentionList';
import { Bell, Shield, Eye, Edit3, CloudOff, Loader2, Zap, MessageSquarePlus, Send } from 'lucide-react';
import { documentService } from '../../services/document.service';

interface NeuralEditorProps {
  documentId: string;
  currentUser: any;
  comments: any[];
  onAddComment: (content: string, anchorData: any) => Promise<any>;
  onReply: (commentId: string, content: string) => Promise<any>;
  onResolve: (commentId: string) => Promise<any>;
  onUpdateComment: (commentId: string, content: string) => Promise<any>;
  onDeleteComment: (commentId: string) => Promise<any>;
  onUpdateReply: (replyId: string, content: string) => Promise<any>;
  onDeleteReply: (replyId: string) => Promise<any>;
  onSyncEvent?: (event: { type: string, payload?: any, kind?: string }) => void;
  userRole?: string;
  shareToken?: string | null;
}

function getNeuralAvatarColor(email: string) {
  const colors = ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#f472b6', '#c084fc', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

import React from 'react';

export const NeuralEditor = React.memo(({
  documentId,
  currentUser,
  comments,
  onAddComment,
  onReply,
  onResolve,
  onUpdateComment,
  onDeleteComment,
  onUpdateReply,
  onDeleteReply,
  onSyncEvent,
  userRole = 'viewer',
  shareToken = null
}: NeuralEditorProps) => {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Phase 9: Save Status & Persistence
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline' | 'error'>('saved');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const isViewer = userRole === 'viewer';
  const yDoc = useMemo(() => new Y.Doc(), []);

  // Sync Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Helper: Convert Uint8Array to Base64 safely
  const toBase64 = useCallback((Uint8Arr: Uint8Array) => {
    let binary = '';
    const len = Uint8Arr.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(Uint8Arr[i]);
    }
    return window.btoa(binary);
  }, []);

  // Phase 9: Debounced Cloud Sync
  const debouncedSync = useMemo(
    () => debounce(async (doc: Y.Doc) => {
      if (!navigator.onLine || isViewer) return;

      try {
        setSaveStatus('saving');
        const state = Y.encodeStateAsUpdate(doc);
        const base64State = toBase64(state);
        
        await documentService.updateDocument(documentId, {
          yjsState: base64State
        });
        
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    }, 2000),
    [documentId, isViewer, toBase64]
  );

  // Determine the name to show in the presence system
  const presenceName = currentUser?.email 
    ? currentUser.email.split('@')[0] 
    : (shareToken ? `Guest_${Math.floor(Math.random() * 1000)}` : 'NeuralNode');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Incompatible with Collaboration
      }),
      Placeholder.configure({
        placeholder: isViewer ? 'Viewing read-only vector...' : 'Enter the Neural Void... Write something remarkable.',
      }),
      Collaboration.configure({
        document: yDoc,
      }),
      provider ? CollaborationCursor.configure({
        provider: provider as any,
        user: {
          name: presenceName,
          color: getNeuralAvatarColor(currentUser?.email || presenceName),
        },
      }) : undefined,
      NeuralSelectionCallback,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention px-1.5 py-0.5 rounded-md bg-accent/10 text-accent font-black border border-accent/20',
        },
        suggestion: {
          render: () => {
            let component: any;
            let popup: any;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },
              onUpdate: (props) => {
                component.updateProps(props);
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as any,
                });
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }
                return component.ref?.onKeyDown(props);
              },
              onExit: () => {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        }
      })
    ].filter((e): e is any => !!e),
    editable: !isViewer,
    content: '',
    shouldRerenderOnTransaction: false,
  }, [provider, isViewer, yDoc]);

  // Phase 7: Add Comment Logic (Moved here to fix declaration order)
  const handleAddComment = useCallback(async () => {
    if (!editor || !commentInput.trim() || isViewer) return;

    const { from, to } = editor.state.selection;
    if (from === to) return;

    try {
      const type = yDoc.getXmlFragment('default');
      const anchorData = {
        from: Y.createRelativePositionFromTypeIndex(type, from - 1), // Tiptap is 1-indexed, Yjs is 0-indexed
        to: Y.createRelativePositionFromTypeIndex(type, to - 1),
      };

      await onAddComment(commentInput, anchorData);
      
      setCommentInput('');
      setIsAddingComment(false);
      editor.commands.focus();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  }, [editor, commentInput, onAddComment, isViewer, yDoc]);

  useEffect(() => {
    if (!documentId) return;

    // 1. Local Persistence (IndexedDB)
    const persistence = new IndexeddbPersistence(documentId, yDoc);
    
    // 2. Real-time Sync (WebSocket)
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    // FIX: Using CORRECT storage key "accessToken"
    const jwtToken = (localStorage.getItem('accessToken') || '').replace(/^Bearer\s+/i, "");
    
    // Pass JWT to server for authentication over WebSocket
    const newProvider = new WebsocketProvider(
      wsUrl,
      documentId,
      yDoc,
      { 
        params: { 
          token: jwtToken || shareToken || '',
        },
      }
    );

    newProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') {
        setSaveStatus('saved');
      }
      if (status === 'disconnected') {
        setSaveStatus('offline');
      }
    });

    // Custom events
    newProvider.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'SYNC_EVENT' || parsed.kind === 'comments' || parsed.type === 'NOTIFICATION') {
          if (onSyncEvent) onSyncEvent(parsed);
        }
        if (parsed.type === 'NOTIFICATION') {
          setNotification(parsed.payload.message);
          setTimeout(() => setNotification(null), 5000);
        }
      } catch {
        // Ignored
      }
    });

    // 3. Watch for changes to trigger autosave
    yDoc.on('update', (_update: Uint8Array, origin: any) => {
      if (origin !== newProvider && !isViewer) {
         debouncedSync(yDoc);
      }
    });

    setProvider(newProvider);

    // Cleanup on unmount (with safety delay for StrictMode)
    return () => {
      setTimeout(() => {
        if (newProvider) {
          newProvider.disconnect();
          newProvider.destroy();
        }
      }, 500);
      setProvider(null);
      persistence.destroy();
      debouncedSync.cancel();
      yDoc.off('update', () => {});
    };
  }, [documentId, shareToken, onSyncEvent, yDoc, debouncedSync, isViewer]);

  if (!editor) return null;

  return (
    <div className="flex h-full w-full relative group bg-bg">
      {/* 🟢 Refined Header Overlay - Relocated to Bottom Right to prevent toolbar overlap */}
      <div className="fixed bottom-8 right-8 z-[60] flex flex-col items-end gap-3 pointer-events-none sm:flex-row sm:items-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
         
         {/* Sync Status Badge */}
         <div className="h-11 px-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-3xl flex items-center gap-3 transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-auto group/status">
           <div className="relative">
             {!isOnline ? (
               <CloudOff className="h-4 w-4 text-red-400" />
             ) : saveStatus === 'saving' ? (
               <Loader2 className="h-4 w-4 animate-spin text-accent" />
             ) : (
               <Zap className={`h-4 w-4 ${saveStatus === 'saved' ? 'text-green-400' : 'text-white/40'}`} />
             )}
             {isOnline && saveStatus === 'saved' && (
               <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400 animate-ping" />
             )}
           </div>
           
           <div className="flex flex-col">
             <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${
               !isOnline ? 'text-red-400' : saveStatus === 'saving' ? 'text-accent' : 'text-white/60'
             }`}>
               {!isOnline ? 'Offline' : 
                saveStatus === 'saving' ? 'Syncing...' : 
                saveStatus === 'error' ? 'Sync Void' : 
                'Connected'}
             </span>
             <span className="text-[7px] font-bold uppercase tracking-tighter opacity-40">
               {saveStatus === 'saved' ? 'Vector Secure' : 'Neural Patching'}
             </span>
           </div>
         </div>

         {/* Access & Presence Badge */}
         <div className="h-11 px-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-3xl flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all hover:bg-white/[0.06] pointer-events-auto">
            {userRole === 'admin' ? (
              <Shield className="h-4 w-4 text-accent" />
            ) : userRole === 'editor' ? (
              <Edit3 className="h-4 w-4 text-blue-400" />
            ) : (
              <Eye className="h-4 w-4 text-white/40" />
            )}
            
            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center gap-2">
              <div 
                className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white/80 ring-1 ring-white/10 shadow-inner"
                style={{ backgroundColor: `${getNeuralAvatarColor(presenceName)}33` }}
              >
                {presenceName[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-h leading-none">
                  {presenceName}
                </span>
                <span className={`text-[7px] font-black uppercase tracking-tighter ${
                  userRole === 'admin' ? 'text-accent' :
                  userRole === 'editor' ? 'text-blue-400 text-opacity-80' :
                  'text-white/20'
                }`}>
                  {userRole} Mode
                </span>
              </div>
            </div>
         </div>

          {/* 🟢 NEW: Export Menu */}
          <div className="flex items-center gap-2 pointer-events-auto">
             <button
                onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/documents/${documentId}/export/pdf`, '_blank')}
                className="h-11 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-h hover:bg-accent hover:text-bg transition-all"
             >
                PDF
             </button>
             <button
                onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/documents/${documentId}/export/docx`, '_blank')}
                className="h-11 px-6 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-h hover:bg-accent hover:text-bg transition-all"
             >
                DOCX
             </button>
          </div>

          {/* 🟢 NEW: Comment Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`h-11 px-6 rounded-2xl transition-all flex items-center gap-3 pointer-events-auto border ${
              isSidebarOpen 
                ? 'bg-accent text-bg border-accent shadow-[0_0_40px_rgba(var(--accent-rgb),0.3)]' 
                : 'bg-black/40 text-white/60 border-white/10 hover:bg-white/5 backdrop-blur-3xl'
            }`}
          >
            <MessageSquarePlus className={`h-4 w-4 ${isSidebarOpen ? '' : 'text-accent'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Neural Feed {isSidebarOpen ? '(Hide)' : `(${comments.length})`}
            </span>
          </button>
      </div>

      {notification && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-500">
           <div className="bg-accent text-bg px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_50px_rgba(var(--accent-rgb),0.4)] flex items-center gap-3 border border-white/10 ring-1 ring-white/20">
              <Bell className="h-4 w-4 animate-bounce" />
              {notification}
           </div>
        </div>
      )}

      {/* Main Editor Surface */}
      <div className="flex-1 overflow-y-auto px-4 md:px-24 lg:px-32 py-10 md:py-24 relative editor-surface custom-scrollbar selection:bg-accent/30 selection:text-white">
        <div className="max-w-4xl mx-auto min-h-[70vh] bg-white/[0.02] rounded-[3rem] p-8 md:p-16 border border-white/5 shadow-2xl relative">
          {/* Animated Background Glow */}
          <div className="absolute top-0 left-1/4 w-1/2 h-full bg-accent/5 blur-[120px] pointer-events-none" />
          
          {/* 🟢 Premium Bubble Menu for Comments */}
          {editor && !isViewer && (
            <BubbleMenu 
              editor={editor} 
              tippyOptions={{ duration: 100, placement: 'top' }}
              className="flex items-center bg-bg/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-1.5 gap-1.5 overflow-hidden ring-1 ring-white/5"
            >
              {!isAddingComment ? (
                <button
                  onClick={() => setIsAddingComment(true)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all group"
                >
                  <MessageSquarePlus className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-h">Add Feedback</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-1 animate-in zoom-in-95 duration-200">
                  <input
                    autoFocus
                    placeholder="Vector insight..."
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[11px] text-text outline-none focus:border-accent/40 w-[200px] transition-all"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                      if (e.key === 'Escape') setIsAddingComment(false);
                    }}
                  />
                  <button
                    disabled={!commentInput.trim()}
                    onClick={handleAddComment}
                    className="p-2 bg-accent text-bg rounded-xl hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </BubbleMenu>
          )}

          <EditorContent 
            editor={editor} 
            className="prose prose-invert max-w-none min-h-[500px] 
              prose-p:text-text-muted prose-p:leading-relaxed prose-p:text-[18px] prose-p:mb-6
              prose-headings:text-text-h prose-headings:font-black prose-headings:tracking-tight
              prose-h1:text-[2.5rem] md:text-[3.5rem] prose-h1:mb-12 prose-h1:leading-none
              prose-blockquote:border-l-accent prose-blockquote:bg-accent/5 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl
              prose-strong:text-accent prose-strong:font-black" 
          />
        </div>
      </div>

      {isSidebarOpen && (
        <CommentSidebar
          comments={comments}
          selectedCommentId={selectedCommentId}
          onSelectComment={setSelectedCommentId}
          onReply={onReply}
          onResolve={onResolve}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
          onUpdateReply={onUpdateReply}
          onDeleteReply={onDeleteReply}
          currentUser={currentUser}
        />
      )}
    </div>
  );
});
