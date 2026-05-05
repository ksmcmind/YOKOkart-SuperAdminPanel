// src/pages/Orders.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchOrders, fetchOrderById, updateOrderStatus, selectAllOrders, selectOrderLoading, selectOrderPagination } from '../store/slices/orderSlice'
import { fetchMarts } from '../store/slices/martSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader  from '../components/PageHeader'
import Button      from '../components/Button'
import Table       from '../components/Table'
import Modal       from '../components/Modal'
import Badge       from '../components/Badge'
import MartSelector from '../components/MartSelector'
import useMart     from '../hooks/useMart'

const STATUS_FLOW = {
  pending:   { next: 'confirmed', label: 'Confirm Order' },
  confirmed: { next: 'preparing', label: 'Start Preparing' },
  preparing: { next: 'assigned',  label: 'Mark Ready' },
}

const STATUSES = ['', 'pending', 'confirmed', 'preparing', 'packed', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']

// ── FilterBar ─────────────────────────────────────────────────────────────
function FilterBar({ committedFilters, onSearch, onReset, loading }) {
    const [draft, setDraft] = useState(committedFilters)
    useEffect(() => { setDraft(committedFilters) }, [committedFilters])

    const set = (k, v) => setDraft(f => ({ ...f, [k]: v }))
    const commit = () => onSearch({ ...draft, page: 1 })
    const reset = () => { setDraft({ status: '', search: '', orderType: '', startDate: '', endDate: '' }); onReset() }
    const onEnter = e => { if (e.key === 'Enter') commit() }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4">
            {/* Top bar */}
            <div className="flex gap-2 p-3">
                <div className="relative flex-1 min-w-0">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        value={draft.search || ''}
                        onChange={e => set('search', e.target.value)}
                        onKeyDown={onEnter}
                        placeholder="Search Order ID..."
                        className="w-full text-xs pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 focus:outline-none transition-all bg-gray-50 focus:bg-white placeholder-gray-400"
                    />
                </div>

                <select
                    value={draft.status || ''}
                    onChange={e => set('status', e.target.value)}
                    className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 min-w-[120px]"
                >
                    <option value="">All Statuses</option>
                    {STATUSES.filter(s => s).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>)}
                </select>

                <select
                    value={draft.orderType || ''}
                    onChange={e => set('orderType', e.target.value)}
                    className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 min-w-[120px]"
                >
                    <option value="">All Types</option>
                    <option value="delivery">Delivery</option>
                    <option value="pos">POS</option>
                </select>

                <Button variant="primary" size="sm" onClick={commit} loading={loading}>Search</Button>
                <Button variant="secondary" size="sm" onClick={reset} disabled={loading}>Reset</Button>
            </div>

            {/* Advanced Filters (Dates) */}
            <div className="flex items-center gap-4 px-3 pb-3 border-t border-gray-50 pt-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">From:</span>
                    <input type="date" value={draft.startDate || ''} onChange={e => set('startDate', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-green-500" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">To:</span>
                    <input type="date" value={draft.endDate || ''} onChange={e => set('endDate', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-green-500" />
                </div>
            </div>
        </div>
    )
}

// ── PaginationBar ─────────────────────────────────────────────────────────────
function PaginationBar({ pagination, onPageChange }) {
    if (!pagination || pagination.totalPages <= 1) return null
    const { page, totalPages, total } = pagination

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm mt-4">
            <p className="text-[11px] text-gray-500">
                Showing page <span className="font-bold text-gray-700">{page}</span> of <span className="font-bold text-gray-700">{totalPages}</span>
                <span className="mx-2 text-gray-200">|</span>
                Total <span className="font-bold text-gray-700">{total}</span> orders
            </p>
            <div className="flex gap-1">
                <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                    className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">‹</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p = page - 2 + i
                    if (page <= 2) p = i + 1
                    if (page >= totalPages - 1) p = totalPages - 4 + i
                    if (p < 1 || p > totalPages) return null
                    return (
                        <button key={p} onClick={() => onPageChange(p)}
                            className={`w-7 h-7 text-xs rounded transition-all ${page === p ? 'bg-green-600 text-white font-bold shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}>{p}</button>
                    )
                })}
                <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
                    className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-green-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">›</button>
            </div>
        </div>
    )
}

export default function Orders() {
  const dispatch = useDispatch()
  const orders   = useSelector(selectAllOrders)
  const loading  = useSelector(selectOrderLoading)
  const pagination = useSelector(selectOrderPagination)
  const { activeMartId: martId, selectorProps } = useMart()

  const [committedFilters, setCommittedFilters] = useState({ status: '', search: '', orderType: '', startDate: '', endDate: '', page: 1 })
  const [selected, setSelected] = useState(null)

  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

  useEffect(() => {
    if (martId) dispatch(fetchOrders({ martId, ...committedFilters }))
  }, [martId, committedFilters, dispatch])

  const handleSearch = (f) => setCommittedFilters({ ...f, page: 1 })
  const handleReset = () => setCommittedFilters({ status: '', search: '', orderType: '', page: 1 })
  const handlePageChange = (p) => setCommittedFilters(f => ({ ...f, page: p }))

  const handleStatus = async (orderId, newStatus) => {
    const res = await dispatch(updateOrderStatus({ orderId, status: newStatus }))
    if (!res.error) {
      dispatch(showToast({ message: `Order ${newStatus}`, type: 'success' }))
      setSelected(null)
      if (martId) dispatch(fetchOrders({ martId, ...committedFilters }))
    } else {
      dispatch(showToast({ message: res.payload || 'Failed', type: 'error' }))
    }
  }

  const handleView = async (order) => {
    setSelected(order)
    const action = await dispatch(fetchOrderById(order.id))
    if (fetchOrderById.fulfilled.match(action)) {
      setSelected(action.payload)
    }
  }

  const columns = [
    { key: 'id',             label: 'Order ID',  render: r => <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border border-gray-200">#{r.id?.slice(-8)}</span> },
    { key: 'total',          label: 'Total',     render: r => <span className="font-bold text-gray-900">₹{r.total}</span> },
    { key: 'payment_method', label: 'Payment',   render: r => <Badge variant="gray" size="xs">{r.payment_method?.toUpperCase()}</Badge> },
    { key: 'order_type',     label: 'Type',      render: r => <Badge variant={r.order_type === 'pos' ? 'purple' : 'blue'} size="xs">{r.order_type.toUpperCase()}</Badge> },
    { key: 'status',         label: 'Status',    render: r => <Badge variant={r.status === 'delivered' ? 'green' : r.status === 'cancelled' ? 'red' : 'blue'}>{r.status.toUpperCase()}</Badge> },
    { key: 'actions',        label: '',   render: r => (
      <div className="flex justify-end gap-2">
        <button onClick={() => handleView(r)} className="text-[10px] text-gray-600 font-black hover:bg-gray-100 px-2 py-1 rounded transition-colors uppercase tracking-tighter">View</button>
        {STATUS_FLOW[r.status] && (
          <button onClick={() => handleStatus(r.id, STATUS_FLOW[r.status].next)} className="text-[10px] text-green-700 font-black hover:bg-green-50 px-2 py-1 rounded transition-colors uppercase tracking-tighter">
            {STATUS_FLOW[r.status].label}
          </button>
        )}
      </div>
    )},
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Orders"
        subtitle="View and manage all orders for your mart"
        action={
          <div className="flex items-center gap-4">
            <MartSelector {...selectorProps} />
            <Button variant="secondary" onClick={() => martId && dispatch(fetchOrders({ martId, ...committedFilters }))}>
              ↻ Refresh
            </Button>
          </div>
        }
      />

      {martId && (
        <FilterBar
          committedFilters={committedFilters}
          onSearch={handleSearch}
          onReset={handleReset}
          loading={loading}
        />
      )}

      {!martId ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500 font-medium shadow-sm">
          Please select a mart from the dropdown to view its orders.
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
             <Table columns={columns} data={orders} loading={loading} emptyText="No orders found for the selected filters" />
          </div>
          <PaginationBar pagination={pagination} onPageChange={handlePageChange} />
        </>
      )}

      {selected && (
        <Modal
          title={`Order #${selected.id?.slice(-8)}`}
          open={!!selected}
          onClose={() => setSelected(null)}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {STATUS_FLOW[selected.status] && (
                <Button variant="primary" onClick={() => handleStatus(selected.id, STATUS_FLOW[selected.status].next)}>
                  {STATUS_FLOW[selected.status].label}
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ['Status',   <Badge key="s" variant={selected.status === 'delivered' ? 'green' : 'blue'}>{selected.status.toUpperCase()}</Badge>],
                ['Total',    <span className="font-bold text-gray-900">₹{selected.total}</span>],
                ['Payment',  selected.payment_method?.toUpperCase()],
                ['Type',     selected.order_type.toUpperCase()],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                  <div className="text-sm font-medium text-gray-900">{value}</div>
                </div>
              ))}
            </div>

            {/* Items Table */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item</th>
                    <th className="text-center py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pricing</th>
                    <th className="text-center py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qty</th>
                    <th className="text-right py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selected.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800">{item.product_name}</span>
                          <span className="text-[10px] text-gray-400">{item.brand} {item.variant_id ? `(${item.variant_id})` : ''}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-medium text-gray-900">₹{item.unit_price}</span>
                          {item.mrp > item.unit_price && (
                            <span className="text-[9px] text-gray-400 line-through">₹{item.mrp}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-gray-700">{item.quantity}</td>
                      <td className="py-3 px-4 text-right font-bold text-primary-600">₹{item.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Summary */}
            <div className="flex justify-end">
              <div className="w-full md:w-64 space-y-2.5 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-medium">₹{selected.subtotal}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Delivery Fee</span>
                  <span className="font-medium">₹{selected.delivery_fee}</span>
                </div>
                {parseFloat(selected.discount) > 0 && (
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Discount</span>
                    <span className="font-medium">-₹{selected.discount}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                  <span className="font-bold text-gray-900">Grand Total</span>
                  <span className="font-black text-primary-600">₹{selected.total}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            {selected.delivery_address && (
              <div className="bg-primary-50/30 rounded-2xl p-4 border border-primary-100">
                <h4 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-2">Delivery Details</h4>
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{selected.delivery_address?.name}</p>
                  <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                    {selected.delivery_address?.line1}, {selected.delivery_address?.city}
                  </p>
                  {selected.delivery_notes && (
                    <div className="mt-2 flex items-start gap-2 bg-white/50 p-2 rounded-lg border border-primary-100">
                       <span className="text-[10px] font-bold text-primary-600">NOTE:</span>
                       <span className="text-[11px] text-gray-600 italic">{selected.delivery_notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}