import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Code,
  Type
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  if (!editor) return null;

  const buttons = [
    {
      icon: <Undo className="h-4 w-4" />,
      label: 'Undo',
      action: () => editor.chain().focus().undo().run(),
      active: false,
      disabled: !editor.can().undo(),
    },
    {
      icon: <Redo className="h-4 w-4" />,
      label: 'Redo',
      action: () => editor.chain().focus().redo().run(),
      active: false,
      disabled: !editor.can().redo(),
    },
    { type: 'divider' },
    {
      icon: <Type className="h-4 w-4" />,
      label: 'Text',
      action: () => editor.chain().focus().setParagraph().run(),
      active: editor.isActive('paragraph'),
    },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    { type: 'divider' },
    {
      icon: <Bold className="h-4 w-4" />,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
    },
    {
      icon: <Code className="h-4 w-4" />,
      label: 'Code',
      action: () => editor.chain().focus().toggleCode().run(),
      active: editor.isActive('code'),
    },
    { type: 'divider' },
    {
      icon: <List className="h-4 w-4" />,
      label: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
    {
      icon: <Quote className="h-4 w-4" />,
      label: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1.5 bg-bg/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl mb-6 ring-1 ring-white/5 sticky top-0 z-[60]">
      {buttons.map((btn, i) => {
        if (btn.type === 'divider') {
          return <div key={`div-${i}`} className="w-[1px] h-6 bg-white/10 mx-1" />;
        }

        return (
          <button
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              btn.action();
            }}
            disabled={btn.disabled}
            className={`p-2 rounded-xl transition-all group flex items-center justify-center
              ${btn.active 
                ? 'bg-accent text-bg shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]' 
                : 'hover:bg-white/5 text-text-h/60 hover:text-accent disabled:opacity-30'}
            `}
            title={btn.label}
          >
            {btn.icon}
          </button>
        );
      })}
    </div>
  );
};
