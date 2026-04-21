// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsLoggedIn } from './store/slices/authSlice'
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

// Protected route wrapper
function Protected({ children }) {
  const isLoggedIn = useSelector(selectIsLoggedIn)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const isLoggedIn = useSelector(selectIsLoggedIn)

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
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  )
}