import React, { useState } from "react";
import { X, CheckCircle, MessageSquare, Reply, Send, User, Hash } from "lucide-react";
import type { Comment, Reply as IReply } from "../services/comment.service";
import { commentService } from "../services/comment.service";

export const CommentSidebar: React.FC<{
  documentId: string;
  comments: Comment[];
  onClose: () => void;
  onRefresh: () => void;
}> = ({ documentId, comments, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");

  const filteredComments = comments.filter((c) => 
    activeTab === "active" ? !c.isResolved : c.isResolved
  );

  return (
    <div className="w-[400px] border-l border-white/5 h-full flex flex-col bg-bg/95 backdrop-blur-3xl animate-in slide-in-from-right duration-700 shadow-[-50px_0_150px_rgba(0,0,0,0.8)] z-50">
      <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/05">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-accent/20 rounded-2xl border border-accent/20">
              <MessageSquare className="h-5 w-5 text-accent" />
           </div>
           <div className="flex flex-col">
              <h2 className="text-[14px] font-black uppercase tracking-[0.4em] text-white">Neural Trace</h2>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mt-1">Comments Registry</span>
           </div>
        </div>
        <button onClick={onClose} className="p-4 hover:bg-white/5 text-white/20 hover:text-white rounded-2xl transition-all border border-transparent hover:border-white/5 active:scale-90"><X size={20} /></button>
      </div>

      <div className="flex p-6 gap-3 bg-white/02">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all duration-500 border ${
            activeTab === "active" ? "bg-accent text-bg border-accent shadow-[0_10px_30px_var(--color-accent)]" : "text-white/40 border-white/5 hover:bg-white/5"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveTab("resolved")}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all duration-500 border ${
            activeTab === "resolved" ? "bg-accent text-bg border-accent shadow-[0_10px_30px_var(--color-accent)]" : "text-white/40 border-white/5 hover:bg-white/5"
          }`}
        >
          Resolved
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-20">
            <Hash className="h-12 w-12 mb-6" />
            <p className="text-[10px] font-black uppercase tracking-[0.5em]">No {activeTab} signals detected</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <CommentThread 
              key={comment.id} 
              comment={comment} 
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>
      
      <div className="p-8 border-t border-white/5 text-center opacity-10">
         <span className="text-[9px] font-black uppercase tracking-[1em]">Neural Link Established</span>
      </div>
    </div>
  );
};

const CommentThread: React.FC<{
  comment: Comment;
  onRefresh: () => void;
}> = ({ comment, onRefresh }) => {
  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleResolve = async () => {
    setIsPending(true);
    try {
      await commentService.resolveComment(comment.id);
      onRefresh();
    } finally {
      setIsPending(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    setIsPending(true);
    try {
      await commentService.createReply(comment.id, replyBody);
      setReplyBody("");
      setIsReplying(false);
      onRefresh();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={`group rounded-[40px] p-6 border transition-all duration-700 ${comment.isResolved ? 'bg-white/02 border-white/5 opacity-50' : 'bg-white/05 border-white/10 hover:border-accent/40 shadow-2xl hover:scale-[1.02]'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[14px] bg-accent/20 border border-accent/20 text-accent flex items-center justify-center text-[12px] font-black shadow-inner">
             {comment.author.email[0].toUpperCase()}
          </div>
          <div className="flex flex-col">
             <span className="text-[11px] font-black text-white tracking-tight leading-none">
               {comment.author.email.split('@')[0]}
             </span>
             <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">ORIGIN_NODE</span>
          </div>
        </div>
        {!comment.isResolved && (
          <button 
            onClick={handleResolve}
            disabled={isPending}
            className="text-white/20 hover:text-accent p-2 rounded-xl hover:bg-accent/10 transition-all border border-transparent hover:border-accent/10 active:scale-90"
            title="Resolve"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <CheckCircle size={18} />}
          </button>
        )}
      </div>

      <div className="relative pl-6 border-l-2 border-white/5 mb-8 selection:bg-accent/40 selection:text-bg">
         <p className="text-[13px] text-white/80 leading-relaxed font-medium">{comment.body}</p>
      </div>

      {comment.replies.length > 0 && (
        <div className="space-y-6 mb-8 pl-8 border-l border-white/5">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="text-xs relative">
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-white/10" />
              <div className="flex items-center gap-3 mb-2">
                <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black text-white">{reply.author.email[0].toUpperCase()}</div>
                <span className="font-black text-white/40 uppercase tracking-tighter text-[9px]">{reply.author.email.split('@')[0]}</span>
              </div>
              <p className="text-white/60 leading-relaxed">{reply.body}</p>
            </div>
          ))}
        </div>
      )}

      {isReplying ? (
        <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            className="w-full text-xs bg-bg/50 border border-white/10 rounded-2xl p-4 focus:ring-1 focus:ring-accent focus:border-accent outline-none min-h-[80px] text-white placeholder-white/10 transition-all shadow-inner"
            placeholder="Transmit reply..."
          />
          <div className="flex justify-end gap-3 mt-4">
            <button 
              onClick={() => setIsReplying(false)}
              className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all bg-white/5 rounded-xl border border-white/5"
            >
              Cancel
            </button>
            <button 
              onClick={handleReply}
              disabled={isPending || !replyBody.trim()}
              className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] bg-accent text-bg rounded-xl hover:shadow-[0_0_20px_var(--color-accent)] active:scale-95 transition-all flex items-center gap-2 group"
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send size={10} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              Transmit
            </button>
          </div>
        </div>
      ) : (
        !comment.isResolved && (
          <button 
            onClick={() => setIsReplying(true)}
            className="text-[10px] text-accent/60 hover:text-accent font-black uppercase tracking-[0.3em] flex items-center gap-3 bg-accent/5 px-6 py-3 rounded-2xl border border-accent/5 hover:border-accent/20 transition-all shadow-xl group"
          >
            <Reply size={14} className="group-hover:-rotate-45 transition-transform" /> Reply
          </button>
        )
      )}
    </div>
  );
};
