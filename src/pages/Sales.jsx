// src/pages/Sales.jsx
//
// Product sales report page.
// Same colour theme, filter format, and component patterns as Inventory.jsx.
//
// CACHE: Redux salesSlice caches every mart+date+page combo.
// Switching tabs or re-navigating to this page never re-fetches
// if the same mart+date range was already loaded.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as XLSX from 'xlsx'
import {
    fetchSalesSummary,
    fetchSalesByProduct,
    fetchProductTrend,
    clearTrend,
    clearCacheForMart,
    selectSalesSummary,
    selectSalesSummaryLoading,
    selectSalesSummaryError,
    selectSalesProducts,
    selectSalesPagination,
    selectSalesProductsLoading,
    selectSalesProductsError,
    selectSalesTrend,
    selectSalesTrendLoading,
    selectSalesTrendProductId,
} from '../store/slices/salesslice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import MartSelector from '../components/MartSelector'
import { fetchMarts } from '../store/slices/martSlice'
import useMart from '../hooks/useMart'

// ── Helpers ───────────────────────────────────────────────────

const fmt = (n, decimals = 2) =>
    n == null ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const fmtRupee = n =>
    n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const fmtDate = iso =>
    !iso ? '—' : new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })

// Today and 30 days ago as YYYY-MM-DD defaults
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
}

// ── Empty filter state ────────────────────────────────────────

const EMPTY_FILTERS = {
    fromDate: daysAgo(30),
    toDate: today(),
    search: '',
    page: 1,
    limit: 50,
}

// ── Quick date range presets ──────────────────────────────────

const DATE_PRESETS = [
    { label: 'Today', from: today(), to: today() },
    { label: 'Yesterday', from: daysAgo(1), to: daysAgo(1) },
    { label: 'Last 7d', from: daysAgo(7), to: today() },
    { label: 'Last 30d', from: daysAgo(30), to: today() },
    { label: 'Last 90d', from: daysAgo(90), to: today() },
]

// ── SummaryCards ──────────────────────────────────────────────

function SummaryCards({ summary, loading }) {
    const cards = [
        { label: 'Total Income', value: fmtRupee(summary?.total_income), color: 'text-primary-600' },
        { label: 'Total Orders', value: summary?.total_orders ?? '—', color: 'text-gray-700' },
        { label: 'Total Qty Sold', value: summary?.total_qty_sold != null ? fmt(summary.total_qty_sold) : '—', color: 'text-green-600' },
        { label: 'Unique Customers', value: summary?.unique_customers ?? '—', color: 'text-blue-600' },
        { label: 'Avg Order Value', value: fmtRupee(summary?.avg_order_value), color: 'text-purple-600' },
        { label: 'Items Sold', value: summary?.total_items_sold ?? '—', color: 'text-orange-500' },
    ]

    return (
        <div className="flex gap-3 flex-wrap">
            {cards.map(c => (
                <div key={c.label} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm min-w-[110px]">
                    <p className={`text-xl font-bold ${c.color}`}>
                        {loading && !summary ? '…' : c.value}
                    </p>
                    <p className="text-[11px] text-gray-400">{c.label}</p>
                </div>
            ))}
        </div>
    )
}

// ── FilterBar ─────────────────────────────────────────────────
// Same layout pattern as Inventory FilterBar.

function FilterBar({ committedFilters, onSearch, onReset, loading }) {
    const [draft, setDraft] = useState(committedFilters)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => { setDraft(committedFilters) }, [committedFilters])

    const set = (k, v) => setDraft(f => ({ ...f, [k]: v }))
    const commit = () => onSearch({ ...draft, page: 1 })
    const reset = () => { setDraft(EMPTY_FILTERS); onReset() }
    const onEnter = e => { if (e.key === 'Enter') commit() }

    const applyPreset = (p) => {
        const next = { ...draft, fromDate: p.from, toDate: p.to, page: 1 }
        setDraft(next)
        onSearch(next)
    }

    const hasFilters = draft.search || draft.fromDate !== EMPTY_FILTERS.fromDate || draft.toDate !== EMPTY_FILTERS.toDate

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

            {/* Top bar */}
            <div className="flex gap-2 p-3">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        value={draft.search}
                        onChange={e => set('search', e.target.value)}
                        onKeyDown={onEnter}
                        placeholder="Search product name or brand…"
                        className="w-full text-xs pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 focus:outline-none transition-all bg-gray-50 focus:bg-white placeholder-gray-400"
                    />
                </div>

                {/* Date range — desktop inline */}
                <div className="hidden md:flex items-center gap-1.5 px-3 border border-gray-200 rounded-xl bg-gray-50 shrink-0">
                    <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input type="date" value={draft.fromDate} onChange={e => set('fromDate', e.target.value)}
                        className="text-xs bg-transparent outline-none py-2 text-gray-700 cursor-pointer" />
                    <span className="text-gray-400 text-xs">→</span>
                    <input type="date" value={draft.toDate} onChange={e => set('toDate', e.target.value)}
                        className="text-xs bg-transparent outline-none py-2 text-gray-700 cursor-pointer" />
                </div>

                {/* Filters toggle */}
                <button
                    onClick={() => setExpanded(e => !e)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all shrink-0 ${expanded
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                        }`}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                    </svg>
                    <span className="hidden sm:inline">Filters</span>
                    {hasFilters && (
                        <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${expanded ? 'bg-white text-primary-600' : 'bg-primary-600 text-white'}`}>
                            •
                        </span>
                    )}
                </button>

                {/* Search button */}
                <button onClick={commit} disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-xl disabled:opacity-50 transition-colors shadow-sm shrink-0">
                    {loading
                        ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    }
                    <span className="hidden sm:inline">{loading ? 'Loading…' : 'Search'}</span>
                </button>
            </div>

            {/* Expanded panel */}
            {expanded && (
                <div className="border-t border-gray-100">
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Quick presets */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Quick Range</p>
                            <div className="flex flex-wrap gap-1.5">
                                {DATE_PRESETS.map(p => (
                                    <button key={p.label} onClick={() => applyPreset(p)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${draft.fromDate === p.from && draft.toDate === p.to
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-primary-50/50'
                                            }`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date range — mobile / manual */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Date Range</p>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 w-8 shrink-0 font-medium">From</span>
                                    <input type="date" value={draft.fromDate} onChange={e => set('fromDate', e.target.value)}
                                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary-400 bg-white" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 w-8 shrink-0 font-medium">To</span>
                                    <input type="date" value={draft.toDate} onChange={e => set('toDate', e.target.value)}
                                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary-400 bg-white" />
                                </div>
                            </div>
                        </div>

                        {/* Per-page */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Results Per Page</p>
                            <div className="flex gap-1.5 flex-wrap">
                                {[25, 50, 100, 200].map(n => (
                                    <button key={n} onClick={() => set('limit', n)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${draft.limit === n
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-primary-50/50'
                                            }`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Panel footer */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                        <button onClick={reset} className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
                            ✕ Clear all filters
                        </button>
                        <button onClick={commit} disabled={loading}
                            className="flex items-center gap-2 text-xs font-bold px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm">
                            {loading ? 'Loading…' : 'Apply & Search'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── PaginationBar — identical to Inventory ────────────────────

function PaginationBar({ pagination, onPageChange }) {
    if (!pagination || pagination.total_pages <= 1) return null
    const { page, total_pages, total, limit } = pagination
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
        <div className="flex items-center justify-between py-3 px-1 border-t border-gray-100 mt-1">
            <span className="text-xs text-gray-500">
                Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
                <span className="font-semibold text-gray-700">{total}</span> products
            </span>
            <div className="flex items-center gap-1">
                <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ← Prev
                </button>
                {getPages().map((p, i) =>
                    p === '...'
                        ? <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
                        : <button key={p} onClick={() => onPageChange(p)}
                            className={`w-8 h-8 text-xs font-semibold rounded-lg border transition-colors ${p === page
                                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                                }`}>
                            {p}
                        </button>
                )}
                <button onClick={() => onPageChange(page + 1)} disabled={page >= total_pages}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Next →
                </button>
            </div>
        </div>
    )
}

// ── TrendModal ────────────────────────────────────────────────
// Daily breakdown for a single product

function TrendModal({ open, onClose, product, martId, committedFilters }) {
    const dispatch = useDispatch()
    const trend = useSelector(selectSalesTrend)
    const loading = useSelector(selectSalesTrendLoading)
    const activePid = useSelector(selectSalesTrendProductId)

    useEffect(() => {
        if (!open || !product || !martId) return
        // Skip fetch if this product's trend is already loaded
        if (activePid === product.product_id) return
        dispatch(fetchProductTrend({
            martId,
            productId: product.product_id,
            fromDate: committedFilters.fromDate,
            toDate: committedFilters.toDate,
        }))
    }, [open, product?.product_id, martId])

    const totalQty = trend.reduce((s, r) => s + parseFloat(r.qty_sold || 0), 0)
    const totalIncome = trend.reduce((s, r) => s + parseFloat(r.income || 0), 0)
    const maxIncome = Math.max(...trend.map(r => parseFloat(r.income || 0)), 1)

    if (!product) return null

    return (
        <Modal
            title={`Daily Trend — ${product.name}`}
            open={open} onClose={onClose} size="xl"
            footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
        >
            {/* Product meta */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                {product.image && (
                    <img src={product.image} alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                )}
                <div>
                    <p className="text-sm font-bold text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.brand} · {product.unit}</p>
                </div>
                <div className="ml-auto flex gap-4 text-right">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Qty</p>
                        <p className="text-lg font-bold text-green-700">{fmt(totalQty)} <span className="text-xs text-gray-500">{product.unit}</span></p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Income</p>
                        <p className="text-lg font-bold text-primary-600">{fmtRupee(totalIncome)}</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
            ) : !trend.length ? (
                <p className="text-sm text-gray-500 py-10 text-center">No sales data for this period.</p>
            ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                {['Date', 'Qty Sold', 'Orders', 'Income', 'Income Bar'].map(h => (
                                    <th key={h} className="text-left text-[10px] uppercase tracking-widest font-bold text-gray-500 pb-2 pr-3 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {trend.map(r => (
                                <tr key={r.sale_date} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{fmtDate(r.sale_date)}</td>
                                    <td className="py-2 pr-3 font-bold text-green-700 tabular-nums">{fmt(r.qty_sold)}</td>
                                    <td className="py-2 pr-3 text-gray-600 tabular-nums">{r.order_count}</td>
                                    <td className="py-2 pr-3 font-bold text-primary-600 tabular-nums whitespace-nowrap">{fmtRupee(r.income)}</td>
                                    <td className="py-2 pr-3 w-40">
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 rounded-full transition-all"
                                                style={{ width: `${(parseFloat(r.income) / maxIncome) * 100}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    )
}

// ── Export helpers ────────────────────────────────────────────

const exportCSV = (products, fromDate, toDate) => {
    const headers = ['Product Name', 'Brand', 'Unit', 'Qty Sold', 'Total Income (₹)', 'Avg Unit Price (₹)', 'Orders']
    const rows = products.map(p => [
        p.name, p.brand || '', p.unit || '',
        p.total_qty_sold, p.total_income, p.avg_unit_price, p.order_count,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sales_report_${fromDate}_to_${toDate}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
}

const exportXLSX = (products, fromDate, toDate) => {
    const headers = ['Product Name', 'Brand', 'Unit', 'Qty Sold', 'Total Income (₹)', 'Avg Unit Price (₹)', 'Order Count']
    const rows = products.map(p => [
        p.name, p.brand || '', p.unit || '',
        parseFloat(p.total_qty_sold), parseFloat(p.total_income),
        parseFloat(p.avg_unit_price), parseInt(p.order_count),
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report')
    XLSX.writeFile(wb, `sales_report_${fromDate}_to_${toDate}.xlsx`)
}

// ── Main Page ─────────────────────────────────────────────────

export default function Sales() {
    const dispatch = useDispatch()
    const { activeMartId: martId, selectorProps } = useMart()

    const summary = useSelector(selectSalesSummary)
    const summaryLoading = useSelector(selectSalesSummaryLoading)
    const products = useSelector(selectSalesProducts)
    const pagination = useSelector(selectSalesPagination)
    const productsLoading = useSelector(selectSalesProductsLoading)
    const productsError = useSelector(selectSalesProductsError)

    const [committedFilters, setCommittedFilters] = useState(EMPTY_FILTERS)
    const [trendProduct, setTrendProduct] = useState(null)
    const prevMartId = useRef(martId)

    useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

    // When martId changes, clear cache for old mart and refetch
    useEffect(() => {
        if (!martId) return
        if (prevMartId.current && prevMartId.current !== martId) {
            dispatch(clearCacheForMart(prevMartId.current))
        }
        prevMartId.current = martId
        dispatch(fetchSalesSummary({ martId, fromDate: committedFilters.fromDate, toDate: committedFilters.toDate }))
        dispatch(fetchSalesByProduct({ martId, ...committedFilters }))
    }, [martId])

    // When filters change (Search button clicked)
    useEffect(() => {
        if (!martId) return
        dispatch(fetchSalesSummary({ martId, fromDate: committedFilters.fromDate, toDate: committedFilters.toDate }))
        dispatch(fetchSalesByProduct({ martId, ...committedFilters }))
    }, [committedFilters])

    const handleSearch = useCallback(f => setCommittedFilters({ ...f, page: 1 }), [])
    const handleFilterReset = useCallback(() => setCommittedFilters(EMPTY_FILTERS), [])
    const handlePageChange = useCallback(p => setCommittedFilters(f => ({ ...f, page: p })), [])

    const handleRefresh = () => {
        if (!martId) return
        dispatch(clearCacheForMart(martId))
        dispatch(fetchSalesSummary({ martId, fromDate: committedFilters.fromDate, toDate: committedFilters.toDate }))
        dispatch(fetchSalesByProduct({ martId, ...committedFilters }))
        dispatch(showToast({ message: 'Sales data refreshed', type: 'success' }))
    }

    // Grid columns — same density/style as inventory
    const columns = [
        {
            key: 'product',
            label: 'Product',
            render: r => (
                <div className="flex items-center gap-2.5">
                    {r.image
                        ? <img src={r.image} alt={r.name} className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
                        : <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-[10px] font-bold shrink-0">IMG</div>
                    }
                    <div>
                        <p className="text-xs font-bold text-gray-800 leading-tight">{r.name}</p>
                        <p className="text-[10px] text-gray-400">{r.brand || '—'}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'unit',
            label: 'Unit',
            render: r => <Badge variant="blue" size="xs">{r.unit || '—'}</Badge>,
        },
        {
            key: 'qty',
            label: 'Qty Sold',
            render: r => (
                <div className="text-right">
                    <p className="text-sm font-bold text-green-700 tabular-nums">{fmt(r.total_qty_sold)}</p>
                    <p className="text-[10px] text-gray-400">{r.unit}</p>
                </div>
            ),
        },
        {
            key: 'income',
            label: 'Total Income',
            render: r => (
                <p className="text-sm font-bold text-primary-600 tabular-nums text-right">
                    {fmtRupee(r.total_income)}
                </p>
            ),
        },
        {
            key: 'avg',
            label: 'Avg Price',
            render: r => (
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-700 tabular-nums">{fmtRupee(r.avg_unit_price)}</p>
                    {r.mrp && (
                        <p className="text-[10px] text-gray-400">MRP {fmtRupee(r.mrp)}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'orders',
            label: 'Orders',
            render: r => (
                <p className="text-xs font-bold text-gray-700 tabular-nums text-center">{r.order_count}</p>
            ),
        },
        {
            key: 'actions',
            label: '',
            render: r => (
                <div className="flex justify-end pr-2">
                    <button
                        onClick={e => { e.stopPropagation(); setTrendProduct(r) }}
                        className="text-[10px] text-primary-700 font-black hover:bg-primary-50 px-2 py-1 rounded transition-colors uppercase tracking-tighter"
                    >
                        Trend
                    </button>
                </div>
            ),
        },
    ]

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <PageHeader
                title="Sales Report"
                subtitle="Per-product qty sold and income — filter by date range"
                action={
                    <div className="flex items-center gap-4">
                        <MartSelector {...selectorProps} />
                        <div className="flex gap-2">
                            <Button variant="secondary"
                                onClick={() => exportCSV(products, committedFilters.fromDate, committedFilters.toDate)}
                                disabled={!products.length}>
                                ↓ CSV
                            </Button>
                            <Button variant="secondary"
                                onClick={() => exportXLSX(products, committedFilters.fromDate, committedFilters.toDate)}
                                disabled={!products.length}>
                                ↓ XLSX
                            </Button>
                            <Button variant="secondary" onClick={handleRefresh} disabled={!martId}>↻ Refresh</Button>
                        </div>
                    </div>
                }
            />

            {/* KPI cards */}
            {martId && (
                <SummaryCards summary={summary} loading={summaryLoading} />
            )}

            {/* Filter bar */}
            {martId && (
                <FilterBar
                    committedFilters={committedFilters}
                    onSearch={handleSearch}
                    onReset={handleFilterReset}
                    loading={productsLoading}
                />
            )}

            {/* Result count */}
            {martId && pagination && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-gray-500">
                        {pagination.total === 0
                            ? 'No products found for this period'
                            : <><span className="font-semibold text-gray-700">{pagination.total}</span> product{pagination.total !== 1 ? 's' : ''} sold</>
                        }
                    </p>
                    {pagination.total_pages > 1 && (
                        <p className="text-xs text-gray-400">Page {pagination.page} of {pagination.total_pages}</p>
                    )}
                </div>
            )}

            {/* Error */}
            {productsError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {productsError}
                </div>
            )}

            {/* Table */}
            {!martId ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-500 font-medium">
                    Please select a mart to view its sales report.
                </div>
            ) : (
                <Grid
                    columns={columns}
                    data={products}
                    loading={productsLoading}
                    emptyText="No sales data for this date range."
                    pagination={false}
                    showSearch={false}
                />
            )}

            {/* Pagination */}
            {martId && <PaginationBar pagination={pagination} onPageChange={handlePageChange} />}

            {/* Daily trend modal */}
            <TrendModal
                open={!!trendProduct}
                onClose={() => { setTrendProduct(null); dispatch(clearTrend()) }}
                product={trendProduct}
                martId={martId}
                committedFilters={committedFilters}
            />
        </div>
    )
}