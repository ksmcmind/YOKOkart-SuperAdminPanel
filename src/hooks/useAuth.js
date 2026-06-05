// src/hooks/useAuth.js
// Provides current user info and mart access
import { useSelector } from 'react-redux'
import { selectUser } from '../store/slices/authSlice'

export default function useAuth() {
  const user = useSelector(selectUser)

  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin'
  const isPlatformAdmin = isSuperAdmin || isAdmin
  const isMartAdmin = user?.role === 'mart_admin'
  const isManager = user?.role === 'manager'
  const isDispatcher = user?.role === 'dispatcher'
  const isStockMgr = user?.role === 'stock_manager'
  const isCashier = user?.role === 'cashier'

  // Platform admin (super_admin / admin) has no fixed mart — sees all
  // Everyone else gets their mart from JWT token
  const martId = isPlatformAdmin ? null : (user?.mongoMartId || null)
  const staffId = user?.id
  // Platform admin can select any mart — others cannot
  const canSelectMart = isPlatformAdmin

  // Role based permissions
  const can = {
    viewAllMarts: isPlatformAdmin,
    manageStaff: isPlatformAdmin || isMartAdmin,
    manageProducts: isPlatformAdmin || isMartAdmin || isManager || isStockMgr,
    manageInventory: isPlatformAdmin || isMartAdmin || isManager || isStockMgr,
    viewOrders: isPlatformAdmin || isMartAdmin || isManager || isDispatcher,
    assignDrivers: isPlatformAdmin || isMartAdmin || isManager || isDispatcher,
    viewReports: isPlatformAdmin || isMartAdmin || isManager,
    manageMarts: isPlatformAdmin,
  }

  return { user, martId, isSuperAdmin, isAdmin, isPlatformAdmin, canSelectMart, can, staffId }
}