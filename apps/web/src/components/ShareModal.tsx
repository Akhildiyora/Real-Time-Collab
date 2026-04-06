import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Shield, Check, Loader2 } from 'lucide-react';
import { userService } from '../services/user.service';
import type { UserSearch } from '../services/user.service';
import { documentService } from '../services/document.service';

interface ShareModalProps {
  documentId: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ documentId, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null); // userId being shared with
  const [sharedUsers, setSharedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const users = await userService.searchUsers(query);
          setResults(users);
        } catch (error) {
          console.error('Search failed', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleShare = async (userId: string) => {
    setSharing(userId);
    try {
      await documentService.shareDocument(documentId, userId, 'editor');
      setSharedUsers(prev => new Set(prev).add(userId));
    } catch (error) {
      console.error('Sharing failed', error);
    } finally {
      setSharing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-xl font-bold text-text">Share Document</h2>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-accent-bg/10 hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-accent-bg/05 py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-2 text-xs">Searching users...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between rounded-xl p-3 hover:bg-accent-bg/10 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent font-bold uppercase">
                      {user.email[0]}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-text">{user.email}</p>
                      <p className="text-xs text-text-muted flex items-center mt-0.5">
                        <Shield className="h-3 w-3 mr-1" /> Editor
                      </p>
                    </div>
                  </div>
                  
                  {sharedUsers.has(user.id) ? (
                    <div className="flex items-center text-xs font-medium text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full">
                      <Check className="h-3 w-3 mr-1" /> Shared
                    </div>
                  ) : (
                    <button
                      onClick={() => handleShare(user.id)}
                      disabled={sharing === user.id}
                      className="inline-flex items-center rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {sharing === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                          Share
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="py-8 text-center text-text-muted">
              <p className="text-sm">No users found for "{query}"</p>
            </div>
          ) : (
            <div className="py-8 text-center text-text-muted">
              <p className="text-sm font-medium">Find people to collaborate</p>
              <p className="mt-1 text-xs">Type a few characters to start searching</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-accent-bg/05 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
            Project Permissions &middot; Editor Role Default
          </p>
        </div>
      </div>
    </div>
  );
};
