// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMarts, selectAllMarts, selectMartsLoading } from '../store/slices/martSlice'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import MartSelector from '../components/MartSelector'
import useAuth from '../hooks/useAuth'
import useMart from '../hooks/useMart'
import api from '../api/index'

export default function Dashboard() {
  const dispatch = useDispatch()
  const marts = useSelector(selectAllMarts)
  const loading = useSelector(selectMartsLoading)
  const { isSuperAdmin } = useAuth()
  const { activeMartId, selectorProps } = useMart()
  const [orders, setOrders] = useState([])

  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

  useEffect(() => {
    if (!activeMartId && !isSuperAdmin) return
    const fetchOrders = async () => {
      if (isSuperAdmin && !activeMartId) {
        // Fetch from all marts
        const all = []
        for (const mart of marts) {
          const res = await api.get(`/orders/mart?martId=${mart._id || mart.id}`)
          if (res.success) all.push(...(res.data || []))
        }
        setOrders(all)
      } else if (activeMartId) {
        const res = await api.get(`/orders/mart?martId=${activeMartId}`)
        if (res.success) setOrders(res.data || [])
      }
    }
    if (marts.length > 0) fetchOrders()
  }, [activeMartId, marts, isSuperAdmin])

  const openMarts = marts.filter(m => m.status === 'open').length
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const todayOrders = orders.filter(o => o.status !== 'cancelled').length

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of KSMCM operations"
        action={<MartSelector {...selectorProps} />}
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Marts" value={marts.length} icon="🏬" color="green" />
        <StatCard label="Open Now" value={openMarts} icon="🟢" color="green" />
        <StatCard label="Today Orders" value={todayOrders} icon="📦" color="yellow" />
        <StatCard label="Pending" value={pendingOrders} icon="⏳" color="yellow" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Today Revenue" value={`₹${totalRevenue.toFixed(0)}`} icon="💰" color="green" sub="Across selected mart" />
      </div>

      {/* Marts list — only super admin sees all */}
      {isSuperAdmin && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">All Marts</h2>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {marts.map(mart => (
                <div key={mart._id || mart.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{mart.name}</p>
                    <p className="text-xs text-gray-400">{mart.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge>{mart.status}</Badge>
                    <span className="text-xs text-gray-400">
                      {mart.service_radius / 1000}km
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent orders */}
      {orders.length > 0 && (
        <div className="card mt-4">
          <div className="card-header">
            <h2 className="card-title">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 10).map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-gray-700">#{o.id?.slice(-8)}</p>
                  <p className="text-xs text-gray-400">{o.payment_method?.toUpperCase()} · {o.order_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">₹{o.total}</p>
                  <Badge>{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}