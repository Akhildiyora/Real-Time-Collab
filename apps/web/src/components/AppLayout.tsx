import type { ReactNode } from 'react'

type AppLayoutProps = {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-svh bg-slate-950 text-slate-100">
      <main className="mx-auto flex max-w-4xl flex-col px-4 py-10">{children}</main>
    </div>
  )
}
