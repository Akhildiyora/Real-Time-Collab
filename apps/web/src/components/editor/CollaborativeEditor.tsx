import { useEffect, useState } from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CommentExtension } from './CommentExtension';
import { MentionExtension } from './MentionExtension';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  MessageCircle, 
  Loader2 
} from 'lucide-react';

interface CollaborativeEditorProps {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: { name: string; color: string };
  onAddComment: () => void;
}

function Toolbar({ editor, onAddComment }: { editor: Editor | null; onAddComment: () => void }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-white/5 bg-bg/40 px-5 py-3 backdrop-blur-3xl shadow-2xl justify-center md:justify-start transition-all duration-700">
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2.5 rounded-xl transition-all duration-300 ${editor.isActive('heading', { level: 1 }) ? 'bg-accent text-bg shadow-[0_0_20px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text'}`}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2.5 rounded-xl transition-all duration-300 ${editor.isActive('heading', { level: 2 }) ? 'bg-accent text-bg shadow-[0_0_20px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text'}`}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <div className="mx-3 h-5 w-[1px] bg-white/10"></div>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2.5 rounded-xl transition-all duration-300 ${editor.isActive('bold') ? 'bg-accent text-bg shadow-[0_0_20px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text'}`}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2.5 rounded-xl transition-all duration-300 ${editor.isActive('italic') ? 'bg-accent text-bg shadow-[0_0_20px_var(--color-accent)] scale-110' : 'hover:bg-white/5 text-text'}`}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="mx-3 h-5 w-[1px] bg-white/10"></div>
      <button
        onClick={onAddComment}
        className="p-2.5 rounded-xl transition-all duration-300 hover:bg-accent/10 hover:text-accent text-text group"
        title="Add Comment"
      >
        <MessageCircle className="h-4 w-4 group-hover:scale-125 transition-transform" />
      </button>
    </div>
  );
}

export function CollaborativeEditor({ ydoc, provider, user, onAddComment }: CollaborativeEditorProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    let isMounted = true;

    // DEFENSIVE CHECK: Ensure extensions exist before using them
    if (!Collaboration || !CollaborationCursor || !StarterKit) {
      console.error("[CATASTROPHIC] TipTap Extensions Failed to Load from Imports");
      return;
    }

    console.log('[Editor] Atomic initialization starting...');
    const editorInstance = new Editor({
      extensions: [
        StarterKit.configure({
          history: false, // Collaboration handles history
        }),
        Collaboration.configure({
          document: ydoc,
        }),
        CollaborationCursor.configure({
          provider: provider as any,
          user: user,
        }),
        CommentExtension,
        MentionExtension,
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none focus:outline-none min-h-[600px] outline-none',
        },
      },
      immediatelyRender: false,
      onCreate: () => {
        if (!isMounted) return;
        // @ts-ignore - custom command
        editorInstance.commands.triggerComment = onAddComment;
        setEditor(editorInstance);
        console.log('[Editor] Surface initialized successfully');
      }
    });

    return () => {
      isMounted = false;
      editorInstance.destroy();
      setEditor(null);
    };
  }, [ydoc, provider, user, onAddComment]);

  if (!editor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-10 animate-in fade-in duration-1000">
         <div className="relative scale-150">
            <Loader2 className="h-8 w-8 animate-spin text-accent opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            </div>
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.6em] text-accent/50">Binding Vector Core...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full animate-in fade-in slide-in-from-bottom-12 duration-1000">
      <Toolbar editor={editor} onAddComment={onAddComment} />
      <div className="p-16 md:p-24 overflow-visible">
        <EditorContent editor={editor} className="bg-transparent" />
      </div>
    </div>
  );
}
