import { EditorComment } from '../../services/comment.service';
import { CommentItem } from './CommentItem';
import { MessageSquare } from 'lucide-react';

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

export function CommentSidebar({
  comments,
  selectedCommentId,
  onSelectComment,
  onReply,
  onResolve,
  onUpdateComment,
  onDeleteComment,
  onUpdateReply,
  onDeleteReply,
  currentUser
}: CommentSidebarProps) {
  return (
    <div className="w-96 border-l border-white/10 bg-bg/50 backdrop-blur-2xl flex flex-col h-full overflow-hidden transition-all duration-500">
      <div className="p-8 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-2xl bg-accent/10 border border-accent/20">
            <MessageSquare className="h-5 w-5 text-accent" />
          </div>
          <h2 className="text-[14px] font-black uppercase tracking-[0.3em] text-text-h">Neural Feedback</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-text-muted uppercase tracking-widest">
          {comments.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isSelected={comment.id === selectedCommentId}
              onSelect={() => onSelectComment(comment.id)}
              onReply={(content) => onReply(comment.id, content)}
              onResolve={() => onResolve(comment.id)}
              onUpdate={(content) => onUpdateComment(comment.id, content)}
              onDelete={() => onDeleteComment(comment.id)}
              onUpdateReply={onUpdateReply}
              onDeleteReply={onDeleteReply}
              currentUser={currentUser}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
            <div className="h-[1px] w-12 bg-accent/50" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Listening for Input</p>
            <div className="h-[1px] w-12 bg-accent/50" />
          </div>
        )}
      </div>
    </div>
  );
}
