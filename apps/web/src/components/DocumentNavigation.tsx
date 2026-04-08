import {
  Share2,
  ArrowLeft,
  MessageSquare,
  History,
  ChevronRight,
  CloudOff,
  Loader2,
  Zap,
  LogOut
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { ThemeToggle } from './ThemeToggle'

interface DocumentNavigationProps {
  title: string
  ownerEmail?: string
  isCommentsOpen: boolean
  isHistoryOpen: boolean
  onBack: () => void
  onToggleComments: () => void
  onToggleHistory: () => void
  onOpenShare: () => void
  userRole: string
  saveStatus?: 'saved' | 'saving' | 'offline' | 'error'
  onStatusChange?: (status: 'saved' | 'saving' | 'offline' | 'error') => void
  isOnline?: boolean
  documentId?: string
}

export function DocumentNavigation({
  title,
  ownerEmail,
  isCommentsOpen,
  isHistoryOpen,
  onBack,
  onToggleComments,
  onToggleHistory,
  onOpenShare,
  userRole,
  saveStatus = 'saved',
  onStatusChange,
  isOnline = true,
  documentId,
}: DocumentNavigationProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExport = async (type: 'pdf' | 'docx') => {
    try {
      if (onStatusChange) onStatusChange('saving');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiUrl}/documents/${documentId}/export/${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      if (onStatusChange) onStatusChange('saved');
    } catch (err) {
      console.error('Export error:', err);
      if (onStatusChange) onStatusChange('error');
    }
  };

  return (
    <div className="w-full border-b border-border bg-bg/70 backdrop-blur-3xl px-6 py-3 shadow-xl sticky top-0 z-[100] transition-all">
      <div className="flex justify-between items-center w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">

        {/* Left Section: Context & Title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-text/[0.03] text-text/60 transition-all hover:bg-text/5 hover:border-border active:scale-95 flex-shrink-0"
            title="Return"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-md md:text-2xl font-black tracking-tight text-text-h uppercase leading-none truncate overflow-hidden">
            {title}
          </div>
        </div>

        {/* Center Section: Path & Role (Centered) */}
        <div className="flex justify-center flex-1">
          <nav className="hidden lg:flex items-center gap-2 text-[9px] md:text-sm font-medium font-black uppercase tracking-[0.1em] text-text/50 whitespace-nowrap">
            <span className="">Docs</span>
            <ChevronRight className="h-2 w-2 md:h-4 md:w-4 " />
            <span className="max-w-[100px]">{ownerEmail?.split('@')[0]}</span>
            <ChevronRight className="h-2 w-2 md:h-4 md:w-4 " />
            <span className={userRole === 'admin' ? 'text-accent/60' : 'text-blue-500/60'}>{userRole}</span>
          </nav>
        </div>

        {/* Right Section: Utilities & Actions */}
        <div className="flex items-center gap-3 justify-end flex-shrink-0">
          {/* Status & Export Group */}
          <div className="hidden xl:flex items-center gap-3 pr-3 border-r border-border/40">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-text/[0.02] border border-border/30">
              {!isOnline ? (
                <CloudOff className="h-4 w-4 text-red-500" />
              ) : saveStatus === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <Zap className={`h-4 w-4 ${saveStatus === 'saved' ? 'text-green-500' : 'text-text/20'}`} />
              )}
              <span className="text-[8px] md:text-xs font-black uppercase tracking-widest text-text/40">
                {saveStatus === 'saving' ? 'Sync' : isOnline ? 'Live' : 'Off'}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-accent/5 p-1 rounded-xl border border-border/50">
              <button 
                onClick={() => handleExport('pdf')}
                className="px-2.5 py-1.5 rounded-lg text-[8px] md:text-xs font-black uppercase tracking-widest hover:bg-text/5 transition-all text-text/40 hover:text-text-h"
              >
                PDF
              </button>
              <button 
                onClick={() => handleExport('docx')}
                className="px-2.5 py-1.5 rounded-lg text-[8px] md:text-xs font-black uppercase tracking-widest hover:bg-text/5 transition-all text-text/40 hover:text-text-h"
              >
                DOCX
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleComments}
              className={`flex h-9 min-w-[36px] items-center justify-center gap-2.5 rounded-xl border transition-all ${
                isCommentsOpen
                  ? 'border-accent bg-accent text-white shadow-[0_4px_15px_rgba(var(--accent-rgb),0.3)]'
                  : 'border-border/50 bg-text/5 text-text/40 hover:border-border hover:bg-text/10 hover:text-text-h'
              } px-4`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden xl:inline font-black text-[9px] md:text-xs uppercase tracking-widest">Feed</span>
            </button>

            <button
              onClick={onOpenShare}
              className="flex h-9 items-center justify-center gap-2.5 rounded-xl border border-purple-500/20 bg-purple-600/5 text-purple-600 dark:text-purple-400 transition-all hover:bg-purple-600/10 px-4"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden xl:inline font-black text-[9px] md:text-xs uppercase tracking-widest">Share</span>
            </button>

            <button
              onClick={onToggleHistory}
              className={`flex h-9 min-w-[36px] items-center justify-center gap-2 rounded-xl border transition-all ${
                isHistoryOpen
                  ? 'border-accent bg-accent text-white shadow-[0_4px_15px_rgba(var(--accent-rgb),0.3)]'
                  : 'border-border/50 bg-text/5 text-text/40 hover:border-border hover:bg-text/10 hover:text-text-h'
              } px-4`}
            >
              <History className="h-4 w-4" />
              <span className="hidden xl:inline font-black text-[9px] md:text-xs uppercase tracking-widest">History</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
