// src/hooks/useAuth.js
// Provides current user info and mart access
import { useSelector } from 'react-redux'
import { selectUser } from '../store/slices/authSlice'

export default function useAuth() {
  const user = useSelector(selectUser)

  const isSuperAdmin = user?.role === 'super_admin'
  const isMartAdmin = user?.role === 'mart_admin'
  const isManager = user?.role === 'manager'
  const isDispatcher = user?.role === 'dispatcher'
  const isStockMgr = user?.role === 'stock_manager'
  const isCashier = user?.role === 'cashier'

  // Super admin has no fixed mart — sees all
  // Everyone else gets their mart from JWT token
  const martId = isSuperAdmin ? null : (user?.mongoMartId || null)
  const staffId = user?.id
  // Super admin can select any mart — others cannot
  const canSelectMart = isSuperAdmin

  // Role based permissions
  const can = {
    viewAllMarts: isSuperAdmin,
    manageStaff: isSuperAdmin || isMartAdmin,
    manageProducts: isSuperAdmin || isMartAdmin || isManager || isStockMgr,
    manageInventory: isSuperAdmin || isMartAdmin || isManager || isStockMgr,
    viewOrders: isSuperAdmin || isMartAdmin || isManager || isDispatcher,
    assignDrivers: isSuperAdmin || isMartAdmin || isManager || isDispatcher,
    viewReports: isSuperAdmin || isMartAdmin || isManager,
    manageMarts: isSuperAdmin,
  }

  return { user, martId, isSuperAdmin, canSelectMart, can, staffId }
}