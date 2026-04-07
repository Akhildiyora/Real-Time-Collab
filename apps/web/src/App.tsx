import { useEffect } from 'react'
import { useAuthStore } from './store/auth.store'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import { DocumentEditorPage } from './pages/DocumentEditorPage'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <ProtectedRoute>
                <DocumentEditorPage />
              </ProtectedRoute>
            }
          />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/documents" element={<Navigate to="/" replace />} />
          {/* Catch-all for other non-matching routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
