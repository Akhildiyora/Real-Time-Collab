import { useState, useEffect, useRef } from 'react';
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
  userRole: string;
}

export function ShareModal({ documentId, isOpen, onClose, documentTitle, ownerEmail, userRole }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shareLink, setShareLink] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom dropdown states
  const [isInviteRoleOpen, setIsInviteRoleOpen] = useState(false);
  const [activeRoleDropdown, setActiveRoleDropdown] = useState<string | null>(null);

  // Refs for click-away detection
  const inviteDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchCollaborators();
    }
  }, [documentId, isOpen]);

  // Click-away listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close invite dropdown if clicked outside
      if (inviteDropdownRef.current && !inviteDropdownRef.current.contains(event.target as Node)) {
        setIsInviteRoleOpen(false);
      }
      // Close member list dropdowns if clicked outside
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setActiveRoleDropdown(null);
      }
    };

    if (isInviteRoleOpen || activeRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInviteRoleOpen, activeRoleDropdown]);

  const fetchCollaborators = async () => {
    try {
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

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share/collaborators/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        setActiveRoleDropdown(null);
        fetchCollaborators();
      }
    } catch (err) {
      console.error('Role update failed:', err);
    }
  };

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share/share-link`, {
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
    navigator.clipboard.writeText(shareLink || window.location.href);
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

  const roles = [
    { value: 'viewer', label: 'Viewer', icon: Eye, color: 'text-blue-400' },
    { value: 'editor', label: 'Editor', icon: Edit2, color: 'text-emerald-400' },
    { value: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 🟢 Soft Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-500" 
        onClick={onClose} 
      />

      {/* 🟢 Professional Component Board */}
      <div className="relative w-full max-w-2xl bg-bg border border-border shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] rounded-[3.5rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-700">
        
        {/* Header Section */}
        <div className="p-10 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-[1.8rem] bg-text/[0.02] border border-border flex items-center justify-center text-accent/80 transition-all shadow-sm">
                <UserPlus className="h-7 w-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-text-h tracking-tight uppercase leading-none">Share Document</h3>
                  <div className="px-3 py-1 rounded-full bg-accent/5 border border-accent/20 text-accent text-[9px] font-black tracking-widest uppercase">
                    Verified Secure
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-[11px] text-text/40 font-bold uppercase tracking-[0.15em]">Manage Sharing & Access</p>
                  {userRole === 'admin' && (
                    <button 
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 mt-2 text-accent/60 hover:text-accent transition-all group w-fit"
                    >
                      <Link className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Copy link access</span>
                      {isCopying && <Check className="h-3 w-3 text-green-500 animate-in zoom-in" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-500 text-text/20 transition-all active:scale-90"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-10 pb-10 space-y-10">
          {/* Add Collaborator Section - Only for Admins/Owners */}
          {userRole === 'admin' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 px-1">
                <Mail className="h-4 w-4 text-accent/40" />
                <span className="text-[10px] font-black text-text/40 uppercase tracking-[0.2em]">Add a person</span>
              </div>
              
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-center gap-4 bg-text/[0.02] p-2 rounded-[2rem] border border-border/50">
                <input 
                  type="email"
                  placeholder="Collaborator email address..."
                  className="flex-1 bg-transparent px-5 py-3 text-sm text-text-h outline-none transition-all placeholder:text-text/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                <div className="flex items-center gap-3 pr-2 relative">
                  {/* Invite Role Dropdown */}
                  <div className="relative" ref={inviteDropdownRef}>
                    <button 
                      type="button"
                      onClick={() => setIsInviteRoleOpen(!isInviteRoleOpen)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-text/5 rounded-xl transition-all group"
                    >
                      <span className="text-[10px] font-black text-text-h uppercase tracking-widest">{role}</span>
                      <Shield className={`h-3.5 w-3.5 transition-colors ${isInviteRoleOpen ? 'text-accent' : 'text-text/20'}`} />
                    </button>
  
                    {isInviteRoleOpen && (
                      <div className="absolute bottom-full mb-3 right-0 bg-bg border border-border rounded-2xl shadow-2xl p-2 min-w-[140px] z-[110] animate-in slide-in-from-bottom-2">
                         {roles.map((r) => (
                           <button
                             key={r.value}
                             type="button"
                             onClick={() => {
                               setRole(r.value as any);
                               setIsInviteRoleOpen(false);
                             }}
                             className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                               role === r.value ? 'bg-accent/10 text-accent' : 'text-text/40 hover:bg-text/5'
                             }`}
                           >
                             {r.label}
                             <r.icon className="h-3 w-3" />
                           </button>
                         ))}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="px-8 h-12 bg-zinc-400 hover:bg-zinc-500 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl active:scale-[0.97] transition-all flex items-center gap-3 disabled:opacity-40 shadow-xl shadow-zinc-200 dark:shadow-none"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                    Grant Access
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* People with access list */}
          <div className="space-y-5">
             <div className="flex items-center justify-between px-1">
               <h4 className="text-[10px] font-black text-text/40 uppercase tracking-[0.3em]">People with access</h4>
               <span className="text-[9px] font-black text-accent/40 uppercase tracking-widest">{collaborators.length + 1} ACTIVE USERS</span>
             </div>
             
             <div className="grid gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                {/* Owner */}
                <div className="flex items-center justify-between p-5 rounded-3xl bg-bg border border-border shadow-sm">
                   <div className="flex items-center gap-5">
                     <div className="h-12 w-12 rounded-[1.2rem] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-sm font-black transition-all">
                       {ownerEmail[0].toUpperCase()}
                     </div>
                     <div>
                        <p className="text-sm font-black text-text-h tracking-tight">{ownerEmail}</p>
                        <div className="flex items-center gap-1.5 text-[9px] text-accent/50 font-black uppercase tracking-[0.2em] mt-1">
                           <Shield className="h-3 w-3" />
                           Owner
                        </div>
                     </div>
                   </div>
                </div>

                {collaborators.filter(c => c.user.email !== ownerEmail).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-5 rounded-3xl bg-bg border border-border/50 hover:bg-text/[0.01] transition-all group relative">
                     <div className="flex items-center gap-5 w-full">
                       <div className="h-12 w-12 rounded-[1.2rem] bg-text/[0.03] border border-border/50 flex items-center justify-center text-sm font-black text-text/40 group-hover:text-accent group-hover:border-accent/40 transition-all">
                         {c.user.email[0].toUpperCase()}
                       </div>
                       <div className="flex items-center justify-between w-full">
                          <p className="text-sm font-black text-text-h tracking-tight">{c.user.email}</p>
                          
                          {/* Member Role Dropdown Toggle */}
                          <div className="relative z-50 " ref={activeRoleDropdown === c.id ? memberDropdownRef : null}>
                            {userRole === 'admin' ? (
                              <button 
                                onClick={() => setActiveRoleDropdown(activeRoleDropdown === c.id ? null : c.id)}
                                className="flex items-center gap-1.5 text-[9px] text-text/30 font-black uppercase tracking-[0.2em] mt-1 hover:text-accent transition-all"
                              >
                                {c.role === 'viewer' ? <Eye className="h-3 w-3" /> : c.role === 'admin' ? <Shield className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                                {c.role}
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[9px] text-text/20 font-black uppercase tracking-[0.2em] mt-1 grayscale opacity-60">
                                {c.role === 'viewer' ? <Eye className="h-3 w-3" /> : c.role === 'admin' ? <Shield className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                                {c.role}
                              </div>
                            )}

                            {activeRoleDropdown === c.id && (
                              <div className="absolute bottom-full left-0 mb-2 bg-bg border border-border rounded-2xl shadow-2xl p-2 min-w-[140px] z-[120] animate-in zoom-in-95 slide-in-from-bottom-2">
                                 {roles.map((r) => (
                                   <button
                                     key={r.value}
                                     onClick={() => handleUpdateRole(c.user.id, r.value)}
                                     className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                       c.role === r.value ? 'bg-accent/10 text-accent' : 'text-text/40 hover:bg-text/5'
                                     }`}
                                   >
                                     {r.label}
                                     <r.icon className="h-3 w-3" />
                                   </button>
                                 ))}
                              </div>
                            )}
                          </div>
                       </div>
                     </div>
                      {userRole === 'admin' && (
                        <button 
                          onClick={() => handleRemoveCollaborator(c.user.id)}
                          className="p-3 rounded-2xl hover:bg-red-500/10 text-red-500/20 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-10 py-8 bg-text/[0.02] border-t border-border/40 flex items-center justify-center">
           <div className="flex items-center gap-2.5 opacity-20 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
              <Shield className="h-3.5 w-3.5 text-accent" />
              <span className="text-[9px] font-black uppercase tracking-widest text-text-h">Neural_Protocol_v2.0_Secure</span>
           </div>
        </div>
      </div>
    </div>
  );
}
