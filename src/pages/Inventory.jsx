// src/pages/admin/AdminInventory.jsx
//
// Super admin inventory dashboard — read-only.
// This page lives on the super admin web app, so every user here is already
// a super admin. No role gating needed at the component level.
//
// Capabilities:
//   - Pick a mart via MartSelector
//   - View dashboard stats (total / out-of-stock / low-stock)
//   - Browse low-stock and out-of-stock lists
//   - Search within the current mart's view
//   - Refresh
//
// Editing (stock changes, price changes, etc.) is done by mart admins only.

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchInventoryDashboard,
    clearDashboard,
    selectInventoryDashboard,
    selectInventoryDashboardLoading,
    selectInventoryDashboardError,
    selectInventoryDashboardForMart,
} from '../store/slices/invetoryslice'
import { fetchMarts, selectAllMarts } from '../store/slices/martSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import StatCard from '../components/StatCard'
import MartSelector from '../components/MartSelector'
import useMart from '../hooks/useMart'

// ── Read-only item row ─────────────────────────────────────────────────────
function ItemRow({ item, showAlert }) {
    const qty = parseFloat(item.stock_qty)
    const alert = parseFloat(item.low_stock_alert)

    return (
        <tr>
            <td className="font-mono text-xs text-gray-600" title={item.mongo_product_id}>
                …{item.mongo_product_id?.slice(-14)}
            </td>
            <td className="font-mono text-xs text-gray-500">{item.variant_id || '—'}</td>
            <td className={`font-semibold ${qty <= 0 ? 'text-red-600' : 'text-yellow-700'}`}>
                {qty}
            </td>
            <td className="text-gray-500">{item.stock_unit || item.unit || '—'}</td>
            {showAlert && <td className="text-gray-400 text-xs">{alert}</td>}
            <td className="text-right">₹{item.sale_price ?? '—'}</td>
            <td className="text-gray-400 text-xs">{item.aisle_location || '—'}</td>
            <td className="text-gray-400 text-xs">
                {item.last_restocked_at
                    ? new Date(item.last_restocked_at).toLocaleDateString()
                    : '—'}
            </td>
        </tr>
    )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminInventory() {
    const dispatch = useDispatch()
    const { activeMartId, selectorProps } = useMart()
    const marts = useSelector(selectAllMarts)

    const dashboard          = useSelector(selectInventoryDashboard)
    const loading            = useSelector(selectInventoryDashboardLoading)
    const error              = useSelector(selectInventoryDashboardError)
    const dashboardForMartId = useSelector(selectInventoryDashboardForMart)

    const [search, setSearch] = useState('')

    // Load marts once
    useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

    // Fetch dashboard when mart changes
    useEffect(() => {
        if (activeMartId && activeMartId !== dashboardForMartId) {
            dispatch(fetchInventoryDashboard(activeMartId))
        }
    }, [activeMartId, dashboardForMartId, dispatch])

    // Cleanup on unmount
    useEffect(() => () => { dispatch(clearDashboard()) }, [dispatch])

    const activeMart = useMemo(
        () => marts.find(m => (m.id || m._id || m.mongoMartId) === activeMartId),
        [marts, activeMartId]
    )

    // Filter items by search query
    const filterFn = (item) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            item.mongo_product_id?.toLowerCase().includes(q) ||
            item.variant_id?.toLowerCase().includes(q) ||
            item.aisle_location?.toLowerCase().includes(q)
        )
    }

    const lowItems = useMemo(
        () => (dashboard?.low_stock_items || []).filter(filterFn),
        [dashboard, search]
    )
    const outItems = useMemo(
        () => (dashboard?.out_of_stock_items || []).filter(filterFn),
        [dashboard, search]
    )

    return (
        <div>
            <PageHeader
                title="Inventory Overview"
                subtitle="Read-only dashboard across all marts"
                action={
                    <div className="flex items-center gap-2">
                        <MartSelector {...selectorProps} />
                        {activeMartId && (
                            <Button
                                variant="secondary"
                                onClick={() => dispatch(fetchInventoryDashboard(activeMartId))}
                                disabled={loading}
                            >
                                ↻ Refresh
                            </Button>
                        )}
                    </div>
                }
            />

            {/* No mart selected */}
            {!activeMartId ? (
                <div className="card py-12 text-center">
                    <div className="text-4xl mb-2">🏪</div>
                    <p className="text-gray-400 text-sm">
                        Select a mart above to view its inventory health
                    </p>
                </div>
            ) : loading ? (
                <div className="py-12 text-center text-gray-400">Loading dashboard...</div>
            ) : error ? (
                <div className="card py-12 text-center">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="text-red-600 font-medium">{error}</p>
                    <Button
                        variant="secondary"
                        className="mt-3"
                        onClick={() => dispatch(fetchInventoryDashboard(activeMartId))}
                    >
                        Try again
                    </Button>
                </div>
            ) : dashboard ? (
                <>
                    {/* Active mart banner */}
                    {activeMart && (
                        <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {activeMart.name || 'Mart'}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {activeMart.city || ''} {activeMart.pincode ? `· ${activeMart.pincode}` : ''}
                                </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                activeMart.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                            }`}>
                                {activeMart.status || (activeMart.is_active ? 'active' : 'inactive')}
                            </span>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <StatCard
                            label="Total Items"
                            value={dashboard.total_items || 0}
                            icon="📦"
                            color="blue"
                        />
                        <StatCard
                            label="Out of Stock"
                            value={dashboard.out_of_stock_count || 0}
                            icon="❌"
                            color="red"
                        />
                        <StatCard
                            label="Low Stock"
                            value={dashboard.low_stock_count || 0}
                            icon="⚠️"
                            color="yellow"
                        />
                    </div>

                    {/* Search */}
                    {(lowItems.length > 0 || outItems.length > 0 || search) && (
                        <div className="mb-4">
                            <input
                                className="input max-w-sm"
                                placeholder="Search by product ID, variant, aisle..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Low Stock */}
                    {lowItems.length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h2 className="card-title text-yellow-700">
                                    ⚠️ Low Stock ({lowItems.length})
                                </h2>
                            </div>
                            <div className="table-wrapper overflow-x-auto">
                                <table className="table text-xs">
                                    <thead>
                                        <tr>
                                            <th>Product ID</th>
                                            <th>Variant</th>
                                            <th>Stock</th>
                                            <th>Unit</th>
                                            <th>Alert At</th>
                                            <th className="text-right">Sale Price</th>
                                            <th>Aisle</th>
                                            <th>Last Restocked</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowItems.map(item => (
                                            <ItemRow
                                                key={item.id || item.mongo_product_id}
                                                item={item}
                                                showAlert
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Out of Stock */}
                    {outItems.length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header">
                                <h2 className="card-title text-red-600">
                                    ❌ Out of Stock ({outItems.length})
                                </h2>
                            </div>
                            <div className="table-wrapper overflow-x-auto">
                                <table className="table text-xs">
                                    <thead>
                                        <tr>
                                            <th>Product ID</th>
                                            <th>Variant</th>
                                            <th>Stock</th>
                                            <th>Unit</th>
                                            <th className="text-right">Sale Price</th>
                                            <th>Aisle</th>
                                            <th>Last Restocked</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {outItems.map(item => (
                                            <ItemRow
                                                key={item.id || item.mongo_product_id}
                                                item={item}
                                                showAlert={false}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* All good */}
                    {lowItems.length === 0 && outItems.length === 0 && !search && (
                        <div className="card py-12 text-center">
                            <div className="text-4xl mb-2">✅</div>
                            <p className="text-gray-700 font-semibold">This mart is fully stocked</p>
                            <p className="text-gray-400 text-sm mt-1">
                                No low-stock or out-of-stock items.
                            </p>
                        </div>
                    )}

                    {/* Search empty */}
                    {lowItems.length === 0 && outItems.length === 0 && search && (
                        <div className="card py-12 text-center">
                            <div className="text-4xl mb-2">🔍</div>
                            <p className="text-gray-600">No items match "{search}"</p>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    )
}