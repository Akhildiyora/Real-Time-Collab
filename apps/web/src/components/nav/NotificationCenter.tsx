import { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, Check, AtSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'MENTION' | 'REPLY';
  referenceId: string;
  isRead: boolean;
  createdAt: string;
  user: { email: string };
}

export function NotificationCenter({ notifications, onMarkAsRead }: { notifications: Notification[], onMarkAsRead: (id: string) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-7 rounded-full bg-white/05 hover:bg-white/10 border border-white/5 transition-all group shadow-2xl ring-1 ring-white/10"
      >
        <Bell className={`h-6 w-6 transition-all duration-500 ${unreadCount > 0 ? 'text-accent animate-[pulse_2s_infinite]' : 'text-white/20'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[9px] font-black text-bg ring-4 ring-bg shadow-[0_0_20px_var(--color-accent)] animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-6 w-80 lg:w-96 bg-bg/95 backdrop-blur-3xl border border-white/5 rounded-[40px] shadow-[0_50px_200px_rgba(0,0,0,0.8)] z-[70] overflow-hidden animate-in fade-in slide-in-from-top-10 duration-700">
           <div className="p-8 border-b border-white/5 bg-white/05">
              <h3 className="text-[12px] font-black uppercase tracking-[0.8em] text-accent">Neural Alerts Central</h3>
           </div>

           <div className="max-h-[60vh] overflow-y-auto scrollbar-hide">
              {notifications.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-6 hover:bg-white/5 transition-all group flex items-start gap-5 ${!notification.isRead ? 'bg-accent/05 border-r-4 border-accent' : ''}`}
                    >
                      <div className={`mt-1 p-3 rounded-2xl ${notification.type === 'MENTION' ? 'bg-accent/10' : 'bg-emerald-500/10'}`}>
                         {notification.type === 'MENTION' ? <AtSign className="h-5 w-5 text-accent" /> : <MessageSquare className="h-5 w-5 text-emerald-500" />}
                      </div>

                      <div className="flex-1 space-y-1">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">Vector ID:: {notification.type}</span>
                            <span className="text-[9px] text-white/20">{formatDistanceToNow(new Date(notification.createdAt))} ago</span>
                         </div>
                         <p className="text-[13px] text-text/80 group-hover:text-white transition-colors leading-relaxed">
                            {notification.type === 'MENTION' ? 'You were mentioned in a document.' : 'Someone replied to your comment.'}
                         </p>
                         
                         {!notification.isRead && (
                           <button 
                            onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                            className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-accent/40 hover:text-accent transition-all flex items-center gap-2"
                           >
                             Dismiss Alert <Check className="h-3 w-3" />
                           </button>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center opacity-10">
                   <Bell className="h-24 w-24 mx-auto mb-8 border-dashed border-2 border-accent/20 rounded-full p-6 animate-pulse" />
                   <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Alert Signals detected</p>
                </div>
              )}
           </div>

           <div className="p-6 bg-white/05 border-t border-white/5 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/10">Pipeline Status:: NOMINAL</p>
           </div>
        </div>
      )}
    </div>
  );
}
