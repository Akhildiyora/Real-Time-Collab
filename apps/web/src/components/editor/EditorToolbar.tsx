import { Editor } from '@tiptap/react';
import { useState, useEffect } from 'react';
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
  Type,
  Scaling,
  TextSelect
} from 'lucide-react';

interface EditorToolbarProps {
  editor: any;
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      forceUpdate({});
    };

    // Actively bind to all editor state changes (typing, cursor moves, selections)
    editor.on('transaction', handleTransaction);
    
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

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
      action: () => {
        editor.chain().focus().unsetInlineSize().setParagraph().run();
      },
      active: editor.isActive('paragraph') && !editor.getAttributes('inlineSize').size,
    },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: 'Heading 1',
      action: () => editor.chain().focus().unsetInlineSize().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: 'Heading 2',
      action: () => editor.chain().focus().unsetInlineSize().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    { type: 'divider' },
    {
      icon: <div className="font-black text-sm flex gap-0.5 items-center">A<span className="text-[10px]">+</span></div>,
      label: 'Large Text',
      action: () => {
        if (editor.isActive('inlineSize', { size: 'large' })) editor.chain().focus().unsetInlineSize().run();
        else editor.chain().focus().setInlineSize('large').run();
      },
      active: editor.isActive('inlineSize', { size: 'large' }),
    },
    {
      icon: <div className="font-black text-sm flex gap-0.5 items-center">A<span className="text-[10px]">-</span></div>,
      label: 'Small Text',
      action: () => {
        if (editor.isActive('inlineSize', { size: 'small' })) editor.chain().focus().unsetInlineSize().run();
        else editor.chain().focus().setInlineSize('small').run();
      },
      active: editor.isActive('inlineSize', { size: 'small' }),
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
    <div className="flex items-center gap-1 p-1.5 mb-3">
      {buttons.map((btn, i) => {
        if (btn.type === 'divider') {
          return <div key={`div-${i}`} className="w-[1px] h-6 bg-white/10 mx-1" />;
        }

        return (
          <button
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
              btn.action?.();
            }}
            disabled={btn.disabled}
            className={`p-2 rounded-xl transition-all group flex items-center justify-center
              ${btn.active 
                ? 'bg-accent text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)] ring-2 ring-accent' 
                : 'bg-transparent hover:bg-white/5 text-text-h/60 hover:text-accent disabled:opacity-30'}
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
