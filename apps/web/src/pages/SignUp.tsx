import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const signUpMutation = useMutation({
    mutationFn: () =>
      apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    onSuccess: () => navigate('/signin'),
  })

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">Sign Up</h1>
      <input className="w-full rounded bg-slate-800 p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded bg-slate-800 p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="rounded bg-indigo-500 px-4 py-2" onClick={() => signUpMutation.mutate()}>
        {signUpMutation.isPending ? 'Creating...' : 'Create account'}
      </button>
    </div>
  )
}
