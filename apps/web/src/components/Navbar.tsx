import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-lg transition-transform group-hover:scale-110">
              <span className="text-xl font-bold italic">R</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-text-h">
              Collab<span className="text-accent underline decoration-accent/30 underline-offset-4">X</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-4 text-sm font-medium text-text">
                <Link to="/documents" className="hover:text-accent transition-colors">Documents</Link>
              </div>
              <div className="h-4 w-[1px] bg-border mx-2 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-sm font-medium text-text-h">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent hover:text-white transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-semibold text-text hover:text-accent transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 items-center justify-center rounded-full bg-accent px-5 text-sm font-bold text-white shadow-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
