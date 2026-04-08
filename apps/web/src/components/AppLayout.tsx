import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { useLocation } from 'react-router-dom';

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  // const isImmersive = location.pathname.startsWith('/documents/');

  return (
    <div className={`min-h-svh bg-bg text-text selection:bg-accent/20 selection:text-accent overflow-hidden`}>
      <Navbar />
      <main className={"h-screen w-full flex flex-col"}>
        {/* <div className={`min-h-svh bg-bg text-text selection:bg-accent/20 selection:text-accent ${isImmersive ? 'overflow-hidden' : ''}`}>
      {!isImmersive && <Navbar />}
      <main className={isImmersive ? "h-screen w-full flex flex-col" : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10"}> */}
        {children}
      </main>
    </div>
  );
}
