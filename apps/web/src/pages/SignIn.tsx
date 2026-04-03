import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { useAuth } from '../hooks/useAuth'

type SignInResponse = {
  accessToken: string
  refreshToken: string
}

function parseJwt(token: string) {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload))
}

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setSession } = useAuth()
  const navigate = useNavigate()

  const signInMutation = useMutation({
    mutationFn: () =>
      apiRequest<SignInResponse>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: ({ accessToken, refreshToken }) => {
      const user = parseJwt(accessToken)
      setSession(accessToken, refreshToken, user)
      navigate('/')
    },
  })

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Sign In</h1>
      <input className="w-full rounded bg-slate-800 p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded bg-slate-800 p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="rounded bg-indigo-500 px-4 py-2" onClick={() => signInMutation.mutate()}>
        {signInMutation.isPending ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="text-sm text-slate-400">No account? <a href="/signup" className="underline">Sign up</a></p>
    </div>
  )
}
