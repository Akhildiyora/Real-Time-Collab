import { useState } from 'react';
import { CheckCircle, Send, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { EditorComment, EditorCommentReply } from '../../services/comment.service';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: EditorComment;
  isSelected: boolean;
  onSelect: () => void;
  onReply: (content: string) => Promise<void>;
  onResolve: () => Promise<void>;
  onUpdate: (content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateReply: (replyId: string, content: string) => Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  currentUser: any;
}

export function CommentItem({
  comment,
  isSelected,
  onSelect,
  onReply,
  onResolve,
  onUpdate,
  onDelete,
  onUpdateReply,
  onDeleteReply,
  currentUser
}: CommentItemProps) {
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [showActions, setShowActions] = useState(false);

  const isAuthor = currentUser?.id === comment.author.id;

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await onReply(replyText);
    setReplyText('');
  };

  const handleUpdate = async () => {
    if (!editText.trim()) return;
    await onUpdate(editText);
    setIsEditing(false);
  };

  const handleUpdateReply = async (replyId: string) => {
    if (!editReplyText.trim()) return;
    await onUpdateReply(replyId, editReplyText);
    setEditingReplyId(null);
  };

  return (
    <div 
      onClick={onSelect}
      className={`group relative p-6 rounded-[32px] border transition-all duration-500 cursor-pointer overflow-hidden
        ${isSelected 
          ? 'bg-accent/10 border-accent/40 shadow-[0_20px_50px_rgba(var(--accent-rgb),0.15)] ring-1 ring-accent/20' 
          : 'bg-white/05 border-white/05 hover:bg-white/10 hover:border-white/20'}`}
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-2xl border border-white/10 flex items-center justify-center text-[11px] font-black group-hover:scale-110 transition-transform duration-500"
            style={{ backgroundColor: `rgba(255,255,255,0.05)` }}
          >
            {comment.author.email[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-tight text-white">{comment.author.email.split('@')[0]}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-text-muted">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 self-start">
          {!comment.isResolved && isAuthor && (
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-10 w-32 bg-bg border border-white/10 rounded-2xl p-2 shadow-2xl z-20 animate-in zoom-in-95 duration-200">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowActions(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); setShowActions(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {!comment.isResolved && (
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(); }}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-accent hover:border-accent hover:text-bg transition-all duration-300"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mb-6 space-y-3" onClick={e => e.stopPropagation()}>
          <textarea
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[13px] outline-none focus:border-accent/40 h-24 resize-none"
            value={editText}
            onChange={e => setEditText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest">Cancel</button>
            <button onClick={handleUpdate} className="px-4 py-2 rounded-xl bg-accent text-bg text-[10px] font-black uppercase tracking-widest">Update</button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed text-text-muted mb-6 px-1 italic">"{comment.content}"</p>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
          {comment.replies.map((reply: EditorCommentReply) => (
            <div key={reply.id} className="group/reply relative flex items-start gap-3 pl-4 border-l border-white/5">
              <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black opacity-60">
                {reply.author.email[0].toUpperCase()}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/80">{reply.author.email.split('@')[0]}</span>
                  {currentUser?.id === reply.author.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingReplyId(reply.id); 
                          setEditReplyText(reply.content);
                        }}
                        className="p-1 hover:text-accent transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteReply(reply.id); }}
                        className="p-1 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
                
                {editingReplyId === reply.id ? (
                  <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
                    <input
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] outline-none focus:border-accent/40"
                      value={editReplyText}
                      onChange={e => setEditReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateReply(reply.id)}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setEditingReplyId(null)} className="p-1.5 rounded-lg bg-white/5 text-[8px] font-black uppercase">Cancel</button>
                      <button onClick={() => handleUpdateReply(reply.id)} className="p-1.5 rounded-lg bg-accent text-bg text-[8px] font-black uppercase">Save</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted opacity-80">{reply.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isSelected && !comment.isResolved && !isEditing && (
        <div className="mt-8 animate-in slide-in-from-bottom-2 duration-500">
          <form onSubmit={handleReply} className="relative group/input">
            <input
              autoFocus
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Inject nested vector..."
              className="w-full bg-bg/50 border border-white/10 rounded-2xl px-6 py-3.5 text-[11px] font-black outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all duration-500 placeholder:opacity-20"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 bottom-1.5 px-4 rounded-xl bg-accent text-bg hover:scale-105 transition-all duration-300 transform"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}

      {comment.isResolved && (
        <div className="absolute inset-0 bg-bg/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="px-6 py-2 rounded-full bg-bg/80 border border-white/10 text-[9px] font-black uppercase tracking-[0.4em] text-accent/60">Resolved</div>
        </div>
      )}
    </div>
  );
}
