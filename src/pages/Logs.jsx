// src/pages/Logs.jsx
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Table from '../components/Table'
import Badge from '../components/Badge'
import {
  fetchBatchMovements,
  fetchStockTransfers,
  fetchGoodsReceipts,
  selectBatchMovements,
  selectStockTransfers,
  selectGoodsReceipts,
} from '../store/slices/logSlice'

const TABS = [
  { id: 'movements', label: 'Warehouse Batch Movements', icon: '🔄' },
  { id: 'transfers', label: 'Stock Transfers Log', icon: '🚚' },
  { id: 'receipts', label: 'Goods Receipts Log', icon: '🧾' },
]

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'supplier_delivery', label: 'Supplier Delivery' },
  { value: 'dispatch', label: 'Dispatch to Mart' },
  { value: 'adjustment', label: 'Manual Adjustment' },
  { value: 'void', label: 'Void Order' },
  { value: 'return', label: 'Customer Return' },
]

const TRANSFER_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'created', label: 'Created' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

const fmtDate = (iso) => !iso ? '—' : new Date(iso).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
})

// ── Pagination Bar ─────────────────────────────────────────────
function PaginationBar({ pagination, onPageChange }) {
  if (!pagination || pagination.total_pages <= 1) return null
  const { page, total, limit, total_pages } = pagination
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  const getPages = () => {
    if (total_pages <= 7) return Array.from({ length: total_pages }, (_, i) => i + 1)
    const pages = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(total_pages - 1, page + 1); i++) pages.push(i)
    if (page < total_pages - 2) pages.push('...')
    pages.push(total_pages)
    return pages
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white border border-gray-100 rounded-xl mt-4 shadow-sm">
      <span className="text-xs text-gray-500 font-medium">
        Showing <span className="font-bold text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-bold text-gray-700">{total}</span> entries
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white">
          ← Prev
        </button>
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="px-1.5 text-xs text-gray-400">…</span>
            : <button key={p} onClick={() => onPageChange(p)}
              className={`w-8 h-8 text-xs font-bold rounded-lg border transition-colors ${p === page
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 bg-white'
                }`}>{p}</button>
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= total_pages}
          className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white">
          Next →
        </button>
      </div>
    </div>
  )
}

export default function Logs() {
  const dispatch = useDispatch()
  const [activeTab, setActiveTab] = useState('movements')

  // Redux Selectors
  const movementsState = useSelector(selectBatchMovements)
  const transfersState = useSelector(selectStockTransfers)
  const receiptsState = useSelector(selectGoodsReceipts)

  const { list: logs, loading, pagination, error } = activeTab === 'movements'
    ? movementsState
    : activeTab === 'transfers'
      ? transfersState
      : receiptsState

  // Filters State
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Fetch Logic
  const fetchLogs = useCallback(async () => {
    const params = {
      page: String(page),
      limit: String(limit),
    }

    if (search.trim()) params.search = search.trim()

    if (activeTab === 'movements') {
      if (type) params.type = type
      dispatch(fetchBatchMovements(params))
    } else if (activeTab === 'transfers') {
      if (status) params.status = status
      dispatch(fetchStockTransfers(params))
    } else if (activeTab === 'receipts') {
      dispatch(fetchGoodsReceipts(params))
    }
  }, [activeTab, page, limit, search, type, status, dispatch])

  // Reset page when tab changes
  useEffect(() => {
    setPage(1)
    setSearch('')
    setType('')
    setStatus('')
  }, [activeTab])

  // Refetch logs on param change
  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (error) {
      dispatch(showToast({ message: error, type: 'error' }))
    }
  }, [error, dispatch])

  const handleReset = () => {
    setSearch('')
    setType('')
    setStatus('')
    setPage(1)
  }

  // ── Movements Column definitions ─────────────────────────────
  const movementColumns = [
    {
      key: 'log_code',
      label: 'Log ID',
      render: r => <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-gray-200">#{r.log_code || r.id?.slice(0, 6)}</span>
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: r => <span className="text-xs text-gray-500 font-medium">{fmtDate(r.created_at)}</span>
    },
    {
      key: 'product',
      label: 'Product Details',
      render: r => (
        <div className="py-1">
          <p className="font-bold text-gray-900 text-xs">{r.product_name}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            SKU: {r.variant_sku} | Batch: <span className="font-bold text-gray-700 bg-gray-100 px-1 py-0.5 rounded">{r.batch_number}</span>
          </p>
        </div>
      )
    },
    {
      key: 'warehouse_name',
      label: 'Warehouse',
      render: r => <span className="text-xs font-semibold text-gray-700">🏭 {r.warehouse_name}</span>
    },
    {
      key: 'staff_name',
      label: 'Performer',
      render: r => <span className="text-xs font-medium text-gray-600">{r.staff_name || 'System / Auto'}</span>
    },
    {
      key: 'type',
      label: 'Type',
      render: r => {
        const typeLabels = {
          supplier_delivery: { label: 'SUPPLIER DELIVERY', var: 'green' },
          dispatch: { label: 'DISPATCH TO MART', var: 'blue' },
          adjustment: { label: 'ADJUSTMENT', var: 'yellow' },
          void: { label: 'VOID ORDER', var: 'red' },
          return: { label: 'CUSTOMER RETURN', var: 'purple' },
        }
        const config = typeLabels[r.type] || { label: r.type?.toUpperCase(), var: 'gray' }
        return <Badge variant={config.var} size="xs">{config.label}</Badge>
      }
    },
    {
      key: 'qty_change',
      label: 'Change',
      render: r => {
        const sign = r.qty_change > 0 ? '+' : ''
        const color = r.qty_change > 0 ? 'text-green-600 font-black' : (r.qty_change < 0 ? 'text-red-600 font-black' : 'text-gray-500 font-medium')
        return <span className={`text-xs ${color}`}>{sign}{r.qty_change}</span>
      }
    },
    {
      key: 'qty_before',
      label: 'Stock Before',
      render: r => <span className="text-xs text-gray-600 font-mono">{r.qty_before}</span>
    },
    {
      key: 'qty_after',
      label: 'Stock After',
      render: r => <span className="text-xs text-gray-900 font-mono font-bold">{r.qty_after}</span>
    },
    {
      key: 'reason',
      label: 'Reason / Notes',
      render: r => <span className="text-xs text-gray-500 italic max-w-xs block truncate" title={r.reason}>{r.reason || '—'}</span>
    }
  ]

  // ── Transfers Column definitions ─────────────────────────────
  const transferColumns = [
    {
      key: 'transfer_code',
      label: 'Ticket ID',
      render: r => <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-blue-100">#{r.transfer_code || r.transfer_id?.slice(0, 6)}</span>
    },
    {
      key: 'created_at',
      label: 'Dispatched At',
      render: r => <span className="text-xs text-gray-500 font-medium">{fmtDate(r.dispatched_at || r.created_at)}</span>
    },
    {
      key: 'warehouse_name',
      label: 'Source Facility',
      render: r => <span className="text-xs font-semibold text-gray-700">🏭 {r.warehouse_name}</span>
    },
    {
      key: 'mart_name',
      label: 'Target Mart',
      render: r => <span className="text-xs font-semibold text-primary-600">🏬 {r.mart_name}</span>
    },
    {
      key: 'product',
      label: 'Product Details',
      render: r => (
        <div className="py-1">
          <p className="font-bold text-gray-900 text-xs">{r.product_name}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
            SKU: {r.variant_sku} | Batch: <span className="font-bold text-gray-600">{r.batch_number || '—'}</span>
          </p>
        </div>
      )
    },
    {
      key: 'qty_dispatched',
      label: 'Dispatched',
      render: r => <span className="text-xs text-gray-700 font-bold font-mono">{r.qty_dispatched}</span>
    },
    {
      key: 'qty_received',
      label: 'Received',
      render: r => r.qty_received !== null ? <span className="text-xs text-green-600 font-bold font-mono">✓ {r.qty_received}</span> : <span className="text-xs text-gray-400 italic">pending</span>
    },
    {
      key: 'billing',
      label: 'Financials',
      render: r => (
        <div className="text-[10px] leading-tight">
          <p className="text-gray-600">Cost: <span className="font-bold">₹{r.unit_cost?.toFixed(2)}</span></p>
          <p className="text-gray-900 font-extrabold mt-0.5">Total: ₹{r.total_bill?.toFixed(2)}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: r => {
        const colors = {
          created: 'blue',
          dispatched: 'orange',
          received: 'green',
          cancelled: 'red'
        }
        return <Badge variant={colors[r.status] || 'gray'} size="xs">{r.status?.toUpperCase()}</Badge>
      }
    },
    {
      key: 'staff_name',
      label: 'Created By',
      render: r => <span className="text-xs text-gray-600">{r.staff_name || 'System'}</span>
    },
    {
      key: 'notes',
      label: 'Notes',
      render: r => <span className="text-xs text-gray-500 italic max-w-xs block truncate" title={r.notes}>{r.notes || '—'}</span>
    }
  ]

  // ── Receipts Column definitions ──────────────────────────────
  const receiptColumns = [
    {
      key: 'receipt_code',
      label: 'Receipt ID',
      render: r => <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-gray-200">#{r.receipt_code || r.receipt_id?.slice(0, 6)}</span>
    },
    {
      key: 'received_at',
      label: 'Received Date',
      render: r => <span className="text-xs text-gray-500 font-medium">{fmtDate(r.received_at)}</span>
    },
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: r => r.invoice_number ? <span className="text-xs font-bold text-gray-800">{r.invoice_number}</span> : <span className="text-xs text-gray-400 italic">none</span>
    },
    {
      key: 'po_number',
      label: 'PO #',
      render: r => r.po_number ? <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-[10px] border border-gray-200">#{r.po_number}</span> : <span className="text-xs text-gray-400 italic">—</span>
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      render: r => <span className="text-xs font-medium text-gray-700">{r.supplier_name || 'Direct Delivery'}</span>
    },
    {
      key: 'warehouse_name',
      label: 'Warehouse',
      render: r => <span className="text-xs font-semibold text-gray-700">🏭 {r.warehouse_name}</span>
    },
    {
      key: 'product',
      label: 'Product Details',
      render: r => (
        <div className="py-1">
          <p className="font-bold text-gray-900 text-xs">{r.product_name}</p>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">SKU: {r.variant_sku}</p>
        </div>
      )
    },
    {
      key: 'qty_received_raw',
      label: 'Received Qty',
      render: r => <span className="text-xs text-gray-700 font-bold font-mono">{r.qty_received_raw} <span className="text-[10px] text-gray-400 font-normal uppercase">{r.receiving_unit}</span></span>
    },
    {
      key: 'qty_in_stock_unit',
      label: 'Converted Qty',
      render: r => <span className="text-xs text-gray-900 font-extrabold font-mono">{r.qty_in_stock_unit} <span className="text-[9px] text-gray-400 font-normal">PCS</span></span>
    },
    {
      key: 'unit_cost',
      label: 'Unit Cost',
      render: r => <span className="text-xs font-bold text-gray-800">₹{r.unit_cost?.toFixed(2)}</span>
    },
    {
      key: 'staff_name',
      label: 'Received By',
      render: r => <span className="text-xs text-gray-600">{r.staff_name || 'System'}</span>
    },
    {
      key: 'notes',
      label: 'Notes',
      render: r => <span className="text-xs text-gray-500 italic max-w-xs block truncate" title={r.notes}>{r.notes || '—'}</span>
    }
  ]

  const activeColumns = activeTab === 'movements' ? movementColumns : (activeTab === 'transfers' ? transferColumns : receiptColumns)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="Activity Logs"
        subtitle="Global auditing system for dark store warehouse stock movements, transfers, and supplier receipts"
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all ${activeTab === t.id
              ? 'border-primary-600 text-primary-600 bg-primary-50/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={activeTab === 'movements' ? "Search Product, Batch, Warehouse..." : (activeTab === 'transfers' ? "Search Product, Warehouse, Mart, Ticket..." : "Search Product, Invoice, Supplier, Warehouse...")}
            className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 focus:outline-none transition-all bg-gray-50 focus:bg-white placeholder-gray-400"
          />
        </div>

        {activeTab === 'movements' && (
          <select
            value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-green-500 min-w-[160px] font-medium"
          >
            {TRANSACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        )}

        {activeTab === 'transfers' && (
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-green-500 min-w-[160px] font-medium"
          >
            {TRANSFER_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}

        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 outline-none focus:border-green-500 min-w-[100px] font-medium"
        >
          <option value="10">10 Rows</option>
          <option value="20">20 Rows</option>
          <option value="50">50 Rows</option>
          <option value="100">100 Rows</option>
        </select>

        <Button variant="secondary" size="sm" onClick={handleReset}>Reset Filters</Button>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <Table
          columns={activeColumns}
          data={logs}
          loading={loading}
          emptyText={`No log entries found for ${TABS.find(t => t.id === activeTab)?.label}`}
        />
      </div>

      {/* Pagination */}
      <PaginationBar pagination={pagination} onPageChange={p => setPage(p)} />
    </div>
  )
}
