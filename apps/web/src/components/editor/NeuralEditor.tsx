import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { NeuralSelectionCallback } from './NeuralSelectionCallback';
import { MentionList } from './MentionList';
import { Bell, MessageSquarePlus, Send } from 'lucide-react';
import { documentService } from '../../services/document.service';
import { Mark, mergeAttributes } from '@tiptap/core';

export const InlineSize = Mark.create({
  name: 'inlineSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: element => element.getAttribute('data-size'),
        renderHTML: attributes => {
          if (!attributes.size) return {};
          return { 
            'data-size': attributes.size,
            style: attributes.size === 'large' ? 'font-size: 1.5em' : 'font-size: 0.75em'
          };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-size]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setInlineSize: (size: string) => ({ commands }: any) => {
        return commands.setMark('inlineSize', { size });
      },
      unsetInlineSize: () => ({ commands }: any) => {
        return commands.unsetMark('inlineSize');
      },
    } as any;
  },
});

interface NeuralEditorProps {
  documentId: string;
  currentUser: any;
  onAddComment: (content: string, anchorData: any) => Promise<any>;
  onSyncEvent?: (event: { type: string, payload?: any, kind?: string }) => void;
  userRole?: string;
  shareToken?: string | null;
  initialContent?: string;
  onStatusChange?: (status: 'saved' | 'saving' | 'offline' | 'error') => void;
  onOnlineChange?: (online: boolean) => void;
}

function getNeuralAvatarColor(email: string) {
  const colors = ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#f472b6', '#c084fc', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

import React from 'react';

import { EditorToolbar } from './EditorToolbar';

export const NeuralEditor = React.memo(({
  documentId,
  currentUser,
  onAddComment,
  onSyncEvent,
  userRole = 'viewer',
  shareToken = null,
  initialContent,
  onStatusChange,
  onOnlineChange
}: NeuralEditorProps) => {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Status management
  const setSaveStatus = useCallback((status: 'saved' | 'saving' | 'offline' | 'error') => {
    onStatusChange?.(status);
  }, [onStatusChange]);

  const setIsOnline = useCallback((online: boolean) => {
    onOnlineChange?.(online);
  }, [onOnlineChange]);

  const isViewer = userRole === 'viewer';
  const yDoc = useMemo(() => new Y.Doc(), []);
  const hasSeededOriginalData = useRef(false);


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
  }, [setIsOnline]);

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
    () => debounce(async (doc: Y.Doc, html: string) => {
      if (!navigator.onLine || isViewer) return;

      try {
        setSaveStatus('saving');
        const state = Y.encodeStateAsUpdate(doc);
        const base64State = toBase64(state);
        
        await documentService.updateDocument(documentId, {
          yjsState: base64State,
          content: html // Storing HTML for formatted export
        });
        
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    }, 2000),
    [documentId, isViewer, toBase64, setSaveStatus]
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
      InlineSize,
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

  // Track live editor ref to avoid stale closure issues in WebSocket callbacks
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync editor editable state whenever the role changes
  useEffect(() => {
    if (editor && editor.isEditable !== !isViewer) {
      editor.setEditable(!isViewer, true);
    }
  }, [editor, isViewer]);

  // Phase 7: Add Comment Logic
  const handleAddComment = useCallback(async () => {
    if (!editor || !commentInput.trim()) return;

    const { from, to } = editor.state.selection;
    if (from === to) return;

    try {
      const type = yDoc.getXmlFragment('default');
      const anchorData = {
        from: Y.createRelativePositionFromTypeIndex(type, from - 1),
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

    // We use a flag to check if IndexedDB has any stored data
    let hasLocalData = false;
    
    const persistence = new IndexeddbPersistence(documentId, yDoc);
    persistence.on('synced', () => {
      // Check if there's any meaningful content in the local DB
      const fragment = yDoc.getXmlFragment('default');
      hasLocalData = fragment.length > 0;
    });

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const jwtToken = (localStorage.getItem('accessToken') || '').replace(/^Bearer\s+/i, "");
    
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

    const handleSync = (isSynced: boolean) => {
      if (isSynced && !hasSeededOriginalData.current && !isViewer && initialContent) {
        hasSeededOriginalData.current = true;
        
        // Wait for Tiptap's Collaboration extension to mount fully
        setTimeout(() => {
          if (editorRef.current) {
            // Check if yDoc has real content from the server or local cache
            const fragment = yDoc.getXmlFragment('default');
            // Tiptap often initializes an empty paragraph resulting in length === 1
            const hasServerData = editorRef.current.getText().trim().length > 0 || fragment.length > 1;
            
            if (!hasServerData && !hasLocalData) {
              // Fresh document with no Yjs state: seed from the uploaded HTML content
              try {
                editorRef.current.commands.setContent(initialContent, false);
              } catch (err) {
                console.warn('[NeuralEditor] Could not seed initial content:', err);
              }
            }
          }
        }, 300);
      }
    };
    newProvider.on('sync', handleSync);

    newProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') setSaveStatus('saved');
      if (status === 'disconnected') setSaveStatus('offline');
    });

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
      } catch { /* Ignored */ }
    });

    setProvider(newProvider);

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
    };
  }, [documentId, shareToken, onSyncEvent, yDoc, debouncedSync, isViewer, setSaveStatus]);
  // NOTE: `editor` and `setIsOnline` are intentionally excluded from deps.
  // Including `editor` causes the WS provider to be torn down on every Tiptap re-render,
  // which breaks collaborative sync. The editor ref is safely captured in the setTimeout callback.

  if (!editor) return null;

  return (
    <div className="flex h-full w-full relative bg-bg overflow-hidden flex-col">
      {notification && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-500">
           <div className="bg-accent text-bg px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_50px_rgba(var(--accent-rgb),0.4)] flex items-center gap-3 border border-white/10 ring-1 ring-white/20">
              <Bell className="h-4 w-4 animate-bounce" />
              {notification}
           </div>
        </div>
      )}

      {/* FIXED TOOLBAR IMMEDIATELY BELOW NAVBAR */}
      {!isViewer && (
        <div className="w-full flex justify-center border-b border-white/5 bg-bg/90 backdrop-blur-xl z-50 pt-3">
          <EditorToolbar editor={editor} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 md:px-6 lg:px-10 py-10 relative editor-surface custom-scrollbar selection:bg-accent/30 selection:text-white">
        <div 
          onClick={() => editor?.commands.focus()}
          className="max-w-4xl mx-auto min-h-[110vh] flex flex-col bg-bg shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-[3rem] p-6 md:p-10 border border-white/5 relative cursor-text"
        >
          <div className="absolute -top-40 left-1/4 w-1/2 h-[800px] bg-accent/5 blur-[160px] pointer-events-none" />
          
          {editor && (
            <BubbleMenu 
              editor={editor} 
              tippyOptions={{ duration: 100, placement: 'top' }}
              className="flex items-center bg-bg/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-1.5 gap-1.5 overflow-hidden ring-1 ring-white/5"
            >
              {!isAddingComment ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click from firing
                    setIsAddingComment(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-xl transition-all group"
                >
                  <MessageSquarePlus className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-[12px] font-bold uppercase tracking-widest text-text-h">Add Feedback</span>
                </button>
              ) : (
                <div 
                  className="flex items-center gap-2 p-1 animate-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()} // Prevent card focus when interacting with menu
                >
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
            className="prose dark:prose-invert max-w-none w-full h-full flex-1 focus:outline-none" 
          />
        </div>
      </div>
    </div>
  );
});
