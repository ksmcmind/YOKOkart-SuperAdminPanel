// src/hooks/useMart.js
// Super admin can select mart from dropdown
// All other roles get martId from their JWT token automatically
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { selectAllMarts } from '../store/slices/martSlice'
import useAuth from './useAuth'

export default function useMart() {
  const { martId: tokenMartId, isSuperAdmin } = useAuth()
  const marts = useSelector(selectAllMarts)

  // Super admin picks a mart from dropdown
  // Others use their assigned martId from token
  const [selectedMartId, setSelectedMartId] = useState('')

  const activeMartId   = isSuperAdmin ? selectedMartId : tokenMartId
  const activeMart     = marts.find(m => (m._id || m.id) === activeMartId)

  return {
    activeMartId,
    activeMart,
    marts,
    isSuperAdmin,
    selectedMartId,
    setSelectedMartId,
    // Mart selector component props — only for super admin
    selectorProps: isSuperAdmin ? {
      show:     true,
      value:    selectedMartId,
      onChange: setSelectedMartId,
      marts,
    } : { show: false },
  }
}