import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { selectIsLoggedIn, selectIsInitialized, getMe } from './store/slices/authSlice'
import Layout     from './components/Layout'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Marts      from './pages/Marts'
import Staff      from './pages/Staff'
import Categories from './pages/Categories'
import Products   from './pages/Products'
import Orders     from './pages/Orders'
import Inventory  from './pages/Inventory'
import Drivers    from './pages/Drivers'
import BulkUpload from './pages/BulkUpload'

// Protected route wrapper
function Protected({ children }) {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const dispatch = useDispatch()
  const isLoggedIn = useSelector(selectIsLoggedIn)
  const isInitialized = useSelector(selectIsInitialized)

  useEffect(() => {
    dispatch(getMe())
  }, [dispatch])

  useEffect(() => {
    if (!isLoggedIn || !isInitialized) return

    const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const socket = io(SOCKET_URL, {
      auth: { token: 'token_in_cookie' },
      transports: ['websocket']
    })

    socket.on('bulk_job_update', (data) => {
      alert(`📢 Bulk Upload Update:\n${data.message}`)
    })

    return () => socket.disconnect()
  }, [isLoggedIn, isInitialized])

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/marts"      element={<Protected><Marts /></Protected>} />
      <Route path="/staff"      element={<Protected><Staff /></Protected>} />
      <Route path="/categories" element={<Protected><Categories /></Protected>} />
      <Route path="/products"   element={<Protected><Products /></Protected>} />
      <Route path="/orders"     element={<Protected><Orders /></Protected>} />
      <Route path="/inventory"  element={<Protected><Inventory /></Protected>} />
      <Route path="/drivers"    element={<Protected><Drivers /></Protected>} />
      <Route path="/bulk-upload" element={<Protected><BulkUpload /></Protected>} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  )
}