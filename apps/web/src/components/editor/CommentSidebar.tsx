import { useState } from 'react';
import { 
  CheckCircle, 
  MessageSquare, 
  Reply, 
  Send, 
  Loader2, 
  Hash,
  Trash2
} from 'lucide-react';
import type { EditorComment, EditorCommentReply } from '../../services/comment.service';

interface CommentSidebarProps {
  comments: EditorComment[];
  selectedCommentId: string | null;
  onSelectComment: (id: string | null) => void;
  onReply: (commentId: string, content: string) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onUpdateReply: (replyId: string, content: string) => Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  currentUser: any;
}

export function   CommentSidebar({
  comments,
  onReply,
  onResolve,
  currentUser,
  onDeleteComment,
  onDeleteReply
}: CommentSidebarProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

  const filteredComments = comments.filter((c) => 
    activeTab === 'active' ? !c.isResolved : c.isResolved
  );

  return (
    <div className="w-full h-full flex flex-col bg-bg/40 backdrop-blur-3xl">
      <div className="px-8 py-4 border-b border-border/50 flex justify-between items-center bg-text/[0.02]">
        <div className="flex items-center gap-4">
           <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/10">
              <MessageSquare className="h-4 w-4 text-accent" />
           </div>
              <h3 className=" font-black uppercase tracking-[0.15em] text-text-h leading-none">Neural Feed</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-text/5 rounded-full border border-border/50">
           <span className="text-sm font-black text-accent">{filteredComments.length}</span>
        </div>
      </div>

      <div className="flex px-8 py-4 gap-2 bg-text/[0.01]">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-sm font-medium font-black uppercase tracking-widest rounded-lg transition-all duration-300 border ${
            activeTab === 'active' ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'text-text/40 border-border/50 hover:bg-text/5'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`flex-1 py-2 text-sm font-medium font-black uppercase tracking-widest rounded-lg transition-all duration-300 border ${
            activeTab === 'resolved' ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'text-text/40 border-border/50 hover:bg-text/5'
          }`}
        >
          Resolved
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar no-scrollbar">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-10">
            <Hash className="h-10 w-10 mb-6 text-text-h" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-text-h">No neural signals detected</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <CommentThread 
              key={comment.id} 
              comment={comment} 
              onReply={onReply}
              onResolve={onResolve}
              onDeleteComment={onDeleteComment}
              onDeleteReply={onDeleteReply}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
}

const CommentThread = ({ 
  comment, 
  onReply, 
  onResolve, 
  onDeleteComment,
  onDeleteReply,
  currentUser 
}: { 
  comment: EditorComment, 
  onReply: any, 
  onResolve: any, 
  onDeleteComment: any,
  onDeleteReply: any,
  currentUser: any 
}) => {
  const [replyBody, setReplyBody] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleResolve = async () => {
    setIsPending(true);
    try {
      await onResolve(comment.id);
    } finally {
      setIsPending(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setIsPending(true);
    try {
      await onReply(comment.id, replyBody);
      setReplyBody('');
      setIsReplying(false);
    } finally {
      setIsPending(false);
    }
  };

  const isOwner = currentUser?.id === comment.author.id;

  return (
    <div className={`group rounded-[24px] py-3 px-4 border transition-all duration-500 overflow-hidden relative ${
      comment.isResolved 
        ? 'bg-text/[0.01] border-border/50 opacity-50' 
        : 'bg-bg-surface border-border hover:border-accent/30 shadow-sm dark:shadow-none'
    }`}>
      {/* Thread Background Detail */}
      {!comment.isResolved && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-3xl rounded-full -mr-12 -mt-12 pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 text-accent flex items-center justify-center font-semibold text-md font-black">
             {comment.author.email[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
             <span className="font-medium text-sm text-text-h leading-none">
               {comment.author.email.split('@')[0]}
             </span>
             <span className="text-[7px] font-medium text-text/60 uppercase tracking-widest">Originator</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!comment.isResolved && (
            <button 
              onClick={handleResolve}
              disabled={isPending}
              className="p-1.5 text-text/50 hover:text-green-500 hover:bg-text/5 rounded-lg transition-all"
              title="Resolve"
            >
              <CheckCircle size={14} />
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => onDeleteComment(comment.id)}
              className="p-1.5 text-text/20 hover:text-red-500 hover:bg-text/5 rounded-lg transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="relative pl-4 border-l-2 border-accent/20 mb-2 bg-text/[0.05] p-2 rounded-r-xl">
         <p className="text-text-h/70 leading-relaxed font-medium">
           {comment.content}
         </p>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-4 mb-6 pl-4">
          {comment.replies.map((reply: EditorCommentReply) => (
            <div key={reply.id} className="relative group/reply">
               <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 rounded bg-text/10 flex items-center justify-center text-[10px] font-black text-text/50">
                    {reply.author.email[0].toUpperCase()}
                  </div>
                  <span className="font-normal text-text/70 tracking-tighter text-[14px]">
                    {reply.author.email.split('@')[0]}
                  </span>
                  {currentUser?.id === reply.author.id && (
                    <button 
                      onClick={() => onDeleteReply(reply.id)}
                      className="opacity-0 group-hover/reply:opacity-100 transition-opacity p-1 text-text/50 hover:text-red-500"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
               </div>
               <p className="text-[11px] text-text/70 leading-relaxed pl-4 border-l-2 border-border/50">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {!comment.isResolved && (
        <div className="relative">
          {isReplying ? (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                autoFocus
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="w-full text-[11px] bg-text/[0.02] border border-border/50 rounded-xl px-3 py-2  focus:border-accent/40 outline-none min-h-[60px] text-text-h placeholder-text/40 transition-all"
                placeholder="Transmit thoughts..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setIsReplying(false)}
                  className="px-3 py-1.5 text-xs font-semibold uppercase text-text/60 hover:text-text-h transition-all bg-text/5 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReply}
                  disabled={isPending || !replyBody.trim()}
                  className="px-4 py-1.5 text-xs font-semibold uppercase bg-accent text-white rounded-lg hover:shadow-lg hover:shadow-accent/40 transition-all flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send size={8} />}
                  Transmit
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsReplying(true)}
              className="text-[9px] text-accent/60 hover:text-accent font-black uppercase tracking-widest flex items-center gap-2 bg-accent/5 px-4 py-2 rounded-xl border border-accent/5 hover:border-accent/10 transition-all group"
            >
              <Reply size={12} className="group-hover:-translate-x-0.5 transition-transform" /> Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
};
