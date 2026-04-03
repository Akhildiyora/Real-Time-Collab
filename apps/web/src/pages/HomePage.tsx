import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuth()

  const createDemoMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ id: string; title: string }>(
        '/documents',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken ?? ''}`,
          },
          body: JSON.stringify({
            title: `Demo - ${user?.email ?? 'user'}`,
            content: '',
          }),
        },
      ),
    onSuccess: (doc) => navigate(`/documents/${doc.id}`),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        Real-Time Collab
      </h1>
      <p className="text-slate-400">
        React, Tailwind, Zustand, React Query, Prisma, Redis, and a Yjs-powered
        collaborative editor are wired up.
      </p>
      <div className="space-x-3">
        <button
          className="inline-flex rounded bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400 disabled:opacity-60"
          onClick={() => createDemoMutation.mutate()}
          disabled={createDemoMutation.isPending}
        >
          {createDemoMutation.isPending ? 'Creating...' : 'Create Demo Document'}
        </button>
      </div>
    </div>
  )
}
