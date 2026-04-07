import { useState, useEffect } from 'react';
import { X, UserPlus, Globe, Copy, Check, Trash2, Shield, Edit2, Eye, Link, Loader2, Mail, Zap } from 'lucide-react';

interface Collaborator {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
  };
}

interface ShareModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  ownerEmail: string;
}

export function ShareModal({ documentId, isOpen, onClose, documentTitle, ownerEmail }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shareLink, setShareLink] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchCollaborators();
    }
  }, [documentId, isOpen]);

  const fetchCollaborators = async () => {
    try {
      // FIX: Use "accessToken" instead of "token"
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share/collaborators`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error('Failed to fetch collaborators:', err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, role })
      });

      if (res.ok) {
        setEmail('');
        fetchCollaborators();
      }
    } catch (err) {
      console.error('Invite failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'viewer' })
      });
      if (res.ok) {
        const data = await res.json();
        setShareLink(data.url);
      }
    } catch (err) {
      console.error('Link generation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share/collaborators/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchCollaborators();
    } catch (err) {
      console.error('Remove failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 🟢 Premium Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-700" 
        onClick={onClose} 
      />

      {/* 🟢 Overhauled Share Panel */}
      <div className="relative w-full max-w-xl bg-bg border border-white/[0.08] rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-700">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="absolute top-0 left-12 w-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-2 bg-accent/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                <div className="relative h-14 w-14 rounded-[1.5rem] bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/10 flex items-center justify-center text-accent shadow-inner">
                  <UserPlus className="h-6 w-6" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-text-h tracking-tight uppercase">Neural_Sync</h3>
                  <div className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] font-black tracking-widest uppercase">
                    RBAC_SECURE
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[11px] text-text-muted font-bold opacity-40 uppercase tracking-widest">Collaborative Node Permissions</p>
                  <p className="text-[11px] font-black text-white uppercase tracking-tighter mt-1 flex items-center gap-2">
                    <Link className="h-3 w-3 text-accent/60" />
                    {documentTitle}
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-text-muted/60 transition-all active:scale-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-8 pt-2 space-y-8">
          {/* 🟢 Invite Form - Unified Vector Style */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Mail className="h-3.5 w-3.5 text-accent/60" />
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Add Neural Collaborator</span>
            </div>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative group">
                <input 
                  type="email"
                  placeholder="Collaborator email address..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-[13px] text-text outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2 h-14">
                <div className="relative group">
                  <select 
                    className="h-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-[11px] text-text outline-none font-black uppercase tracking-wider appearance-none focus:border-accent/40 cursor-pointer min-w-[120px]"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <Shield className="h-3 w-3" />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="px-6 bg-accent text-bg font-black text-[11px] uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-[0.97] transition-all shadow-xl shadow-accent/20 flex items-center gap-2 whitespace-nowrap group disabled:opacity-50 disabled:grayscale"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current group-hover:animate-pulse" />}
                  GRANT_ACCESS
                </button>
              </div>
            </form>
          </div>

          {/* 🟢 Collaborator List - Glass Cards Area */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
               <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em]">Access Collective</h4>
               <span className="text-[8px] font-black text-accent/50 uppercase tracking-widest">{collaborators.length} ACTIVE_CHANNELS</span>
             </div>
             
             <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Always show owner first */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] ring-1 ring-white/[0.02]">
                   <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent text-xs font-black shadow-inner">
                       {ownerEmail[0].toUpperCase()}
                     </div>
                     <div>
                        <p className="text-[13px] font-black text-text tracking-tight">{ownerEmail}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-accent/60 font-black uppercase tracking-[0.2em] mt-0.5">
                           <Shield className="h-3 w-3" />
                           Node Owner
                        </div>
                     </div>
                   </div>
                </div>

                {collaborators.filter(c => c.user.email !== ownerEmail).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all group/item">
                     <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-xl bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-black text-white/40 group-hover/item:text-accent group-hover/item:border-accent/30 transition-all">
                         {c.user.email[0].toUpperCase()}
                       </div>
                       <div>
                          <p className="text-[13px] font-black text-text tracking-tight">{c.user.email}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-text-muted font-black uppercase tracking-[0.2em] mt-0.5 group-hover/item:text-accent/60 transition-all">
                             {c.role === 'admin' ? <Shield className="h-3 w-3" /> : c.role === 'editor' ? <Edit2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                             {c.role} Mode
                          </div>
                       </div>
                     </div>
                     <button 
                      onClick={() => handleRemoveCollaborator(c.user.id)}
                      className="p-3 rounded-xl hover:bg-red-500/10 text-red-500/20 hover:text-red-500 transition-all transform scale-90 opacity-0 group-hover/item:opacity-100 group-hover/item:scale-100"
                     >
                       <Trash2 className="h-5 w-5" />
                     </button>
                  </div>
                ))}

                {collaborators.length === 0 && (
                  <div className="py-12 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-2">
                    <UserPlus className="h-8 w-8 text-white/5" />
                    <p className="text-[10px] font-black text-text-muted/30 uppercase tracking-widest">No active collaborators</p>
                  </div>
                )}
             </div>
          </div>

          {/* 🟢 Public Access Section - Vector Bridge Style */}
          <div className="p-1">
             {!shareLink ? (
               <button 
                onClick={handleGenerateLink}
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center gap-3 text-[11px] font-black text-white/60 hover:text-accent hover:border-accent/40 transition-all active:scale-[0.98] group"
               >
                 {isLoading ? (
                   <Loader2 className="h-4 w-4 animate-spin text-accent" />
                 ) : (
                   <Globe className="h-4 w-4 group-hover:scale-110 transition-all duration-500 group-hover:text-accent" />
                 )}
                 GENERATE_PUBLIC_ACCESS_VECTOR
               </button>
             ) : (
               <div className="space-y-4 p-6 rounded-[2rem] bg-accent/5 border border-accent/20 ring-1 ring-accent/10 animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-accent/5">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-accent">
                        <Globe className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Public Share Vector Active</span>
                     </div>
                     <button 
                      onClick={() => setShareLink('')}
                      className="text-[9px] font-black text-text-muted/40 hover:text-red-400 uppercase tracking-tighter"
                     >
                       Revoke
                     </button>
                  </div>
                  <div className="flex gap-2">
                     <div className="flex-1 bg-black/60 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-text-muted font-mono outline-none flex items-center overflow-hidden">
                       <span className="truncate opacity-60 italic">{shareLink}</span>
                     </div>
                     <button 
                      onClick={handleCopyLink}
                      className="p-3 bg-accent text-bg shadow-lg shadow-accent/30 rounded-xl hover:brightness-110 active:scale-90 transition-all"
                     >
                       {isCopying ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                     </button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
           <div className="flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
              <Shield className="h-3 w-3 text-accent" />
              <span className="text-[8px] font-black uppercase tracking-widest text-text-h">Neural_Protocol_v2.0_Secure</span>
           </div>
        </div>
      </div>
    </div>
  );
}
