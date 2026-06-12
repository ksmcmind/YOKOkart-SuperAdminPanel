import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchWarehouses,
  fetchWarehouseInventorySummary,
  fetchWarehouseInventoryRows,
  fetchWarehouseBatches,
  addWarehouseStock,
  adjustWarehouseStock,
  bulkUploadWarehouseInventory,
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
  fetchPOs,
  createPO,
  updatePOStatus,
  receiveGoods,
  fetchPODetails,
  setSelectedWarehouseId as setSelectedWarehouseIdAction,
  setSummaryPage as setSummaryPageAction,
  setSummaryLimit as setSummaryLimitAction,
  setBatchesPage as setBatchesPageAction,
  setBatchesLimit as setBatchesLimitAction,
  setActiveTab as setActiveTabAction,
  selectAllWarehouses
} from '../store/slices/warehouseSlice'
import { fetchProducts } from '../store/slices/productSlice'
import api from '../api/index'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select, Textarea } from '../components/Input'
import BulkUploadModal from '../components/BulkUploadModal'
import StatCard from '../components/StatCard'
import AutocompleteVariantSelect from '../components/AutocompleteVariantSelect'

const SCHEMA_FIELDS = [
  'product_code',
  'variant_code',
  'batch_number',
  'qty_received',
  'expiry_date',
  'stock_unit',
  'asl',
  'unit_cost',
  'manufacture_date',
  'best_before_date',
  'reorder_level',
  'reorder_qty'
]

const FIELD_VALIDATORS = {
  product_code: (v) => v.trim() !== '' || 'Product Code is required',
  variant_code: (v) => v.trim() !== '' || 'Variant Code is required',
  batch_number: (v) => v.trim() !== '' || 'Batch Number is required',
  qty_received: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be a number > 0',
  expiry_date: (v) => v.trim() !== '' || 'Expiry Date is required',
  stock_unit: (v) => ['pcs', 'kg', 'g', 'l', 'ml', 'dozen', 'ton', 'lb', 'oz', 'ft', 'm'].includes(String(v).toLowerCase().trim()) || 'Invalid stock unit',
  asl: (v) => v.trim() !== '' || 'ASL coordinate is required',
  unit_cost: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be a cost > 0',
  manufacture_date: (v) => v.trim() !== '' || 'Manufacture Date is required',
  best_before_date: (v) => v.trim() !== '' || 'Best Before Date is required',
  reorder_level: (v) => (!isNaN(parseInt(v)) && parseInt(v) >= 0) || 'Must be >= 0',
  reorder_qty: (v) => (!isNaN(parseInt(v)) && parseInt(v) >= 0) || 'Must be >= 0',
}

const PACKAGE_UNITS = [
  { value: 'box', label: 'Box' },
  { value: 'carton', label: 'Carton' },
  { value: 'sack', label: 'Sack' },
  { value: 'bag', label: 'Bag' },
  { value: 'barrel', label: 'Barrel' },
  { value: 'drum', label: 'Drum' },
  { value: 'crate', label: 'Crate' },
  { value: 'pallet', label: 'Pallet' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'roll', label: 'Roll' },
  { value: 'pack', label: 'Pack' },
  { value: 'case', label: 'Case' }
]

const EMPTY_RESTOCK_FORM = {
  productId: '',
  variantId: '',
  variantLabel: '',
  pkgQuantity: '',
  pkgUnit: '',
  conversionFactor: '1',
  stockUnit: 'pcs',
  ASL: '',
  batchNumber: '',
  unitCost: '',
  manufactureDate: '',
  expiryDate: '',
  bestBeforeDate: '',
  reorderLevel: '50',
  reorderQty: '200',
  notes: ''
}



// ── Custom Styled Pagination Bar ───────────────────────────────────────────────
function PaginationBar({ pagination, onPageChange, itemsPerPage, setItemsPerPage }) {
  if (!pagination || pagination.total_pages <= 1) {
    return (
      <div className="flex items-center justify-between py-3 px-1 border-t border-slate-100 mt-2">
        <span className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{pagination.total || 0}</span> items
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Per Page:</span>
          <select
            value={itemsPerPage}
            onChange={e => setItemsPerPage(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white font-medium text-slate-600 focus:outline-none cursor-pointer"
          >
            {[10, 25, 50, 100].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  const { page, total_pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const getPages = () => {
    if (total_pages <= 7) return Array.from({ length: total_pages }, (_, i) => i + 1);
    const pages = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(total_pages - 1, page + 1); i++) pages.push(i);
    if (page < total_pages - 2) pages.push('...');
    pages.push(total_pages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between py-3 px-1 border-t border-slate-100 mt-2">
      <span className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-slate-700">{total}</span> items
      </span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Rows:</span>
          <select
            value={itemsPerPage}
            onChange={e => setItemsPerPage(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded px-2 py-1 bg-white font-semibold text-slate-600 focus:outline-none cursor-pointer"
          >
            {[10, 25, 50, 100].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-xl hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 bg-white shadow-sm"
          >
            ← Prev
          </button>
          {getPages().map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="px-1 text-xs text-slate-400">…</span>
              : <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 text-xs font-bold rounded-xl border transition-all duration-200 ${p === page
                  ? 'bg-primary-600 border-primary-600 text-white shadow-md scale-105'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600'
                  }`}
              >
                {p}
              </button>
          )}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= total_pages}
            className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-xl hover:border-primary-300 hover:text-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 bg-white shadow-sm"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}


export default function WarehouseInventory() {
  const dispatch = useDispatch()
  const summaryCacheRef = useRef({})

  // Redux Selectors
  const warehouses = useSelector(selectAllWarehouses)
  const selectedWarehouseId = useSelector(state => state.warehouse.selectedWarehouseId)
  const activeTab = useSelector(state => state.warehouse.activeTab)
  const summaryPage = useSelector(state => state.warehouse.summaryPage)
  const summaryLimit = useSelector(state => state.warehouse.summaryLimit)
  const batchesPage = useSelector(state => state.warehouse.batchesPage)
  const batchesLimit = useSelector(state => state.warehouse.batchesLimit)

  // Redux Action Dispatchers
  const setSelectedWarehouseId = (val) => dispatch(setSelectedWarehouseIdAction(val))
  const setActiveTab = (val) => dispatch(setActiveTabAction(val))
  const setSummaryPage = (val) => dispatch(setSummaryPageAction(val))
  const setSummaryLimit = (val) => dispatch(setSummaryLimitAction(val))
  const setBatchesPage = (val) => dispatch(setBatchesPageAction(val))
  const setBatchesLimit = (val) => dispatch(setBatchesLimitAction(val))

  // Base State
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const suggestRef = useRef(null)

  const handleSearch = async (q, productId = '') => {
    let finalProductId = productId
    if (q && q.trim() && !productId) {
      // Option A: Resolve text query by calling autocomplete API to find the top suggestion's ID
      try {
        const res = await api.get(`/products/autocomplete?q=${encodeURIComponent(q.trim())}`)
        if (res.success && res.data?.suggestions?.length > 0) {
          const topSuggest = res.data.suggestions[0]
          finalProductId = topSuggest.product_id || ''
          setInputValue(topSuggest.name)
          q = topSuggest.name
        }
      } catch (err) {
        console.error('[Resolve search ID] Failed:', err)
      }
    }
    setSelectedProductId(finalProductId)
    setSearch(q)
    setShowSuggest(false)
  }

  const handleSelectSuggest = (s) => {
    const term = s.name
    setInputValue(term)
    handleSearch(term, s.product_id)
  }

  // Debounced autocomplete suggestions on typing
  useEffect(() => {
    const q = inputValue.trim()
    if (!q || q.length < 2 || q === search.trim()) {
      setSuggestions([])
      if (q === search.trim()) {
        setShowSuggest(false)
      }
      return
    }

    const timer = setTimeout(async () => {
      setSuggestLoading(true)
      try {
        const res = await api.get(`/products/autocomplete?q=${encodeURIComponent(q)}`)
        if (res.success) {
          setSuggestions(res.data?.suggestions || [])
          setShowSuggest(true)
        }
      } catch (err) {
        console.error('[Autocomplete] Failed:', err)
      } finally {
        setSuggestLoading(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [inputValue, search])

  // Close suggestions on click outside
  useEffect(() => {
    const clickOut = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', clickOut)
    return () => document.removeEventListener('mousedown', clickOut)
  }, [])

  // Catalog Products (only loaded once for single restock variant selector lookup)
  const [catalogProducts, setCatalogProducts] = useState([])

  // Tab 1: Summary List State
  const [inventory, setInventory] = useState([])
  const [summaryStats, setSummaryStats] = useState({
    total_skus: 0,
    total_batches: 0,
    total_stock: 0,
    total_reserved: 0,
    total_available: 0,
    expiring_soon_qty: 0,
    out_of_stock_skus: 0
  })

  // Tab 2: Batches List State
  const [batches, setBatches] = useState([])
  const [batchesPagination, setBatchesPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 0 })

  // Modals & Submissions
  const [bulkOpen, setBulkOpen] = useState(false)
  const [restockOpen, setRestockOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)

  const [selectedItem, setSelectedItem] = useState(null) // selected Batch
  const [submitting, setSubmitting] = useState(false)

  // Forms State
  const [restockForm, setRestockForm] = useState(EMPTY_RESTOCK_FORM)
  const [adjustForm, setAdjustForm] = useState({ qtyChange: '', mode: 'add', reason: '' })

  // Filters (Tab 1 Summary Specific)
  const [summaryFilter, setSummaryFilter] = useState('all') // 'all' | 'expiring_soon' | 'low_stock'
  const [summaryPagination, setSummaryPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 0 })

  // Filters (Tab 2 Batches Specific)
  const [batchFilter, setBatchFilter] = useState('expiring_soon') // 'all' | 'expiring_soon' | 'expired' | 'low_stock'

  // ── Date Formatting Utility ──────────────────────────────────────────────────
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadWarehouses = () => {
    dispatch(fetchWarehouses())
  }

  useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
      const activeOnes = warehouses.filter(w => w.is_active)
      const def = activeOnes.length > 0 ? activeOnes[0] : warehouses[0]
      setSelectedWarehouseId(def.warehouse_id)
    }
  }, [warehouses, selectedWarehouseId])

  const handleRefreshData = () => {
    dispatch(fetchWarehouses(true))
    fetchSummaryStats()
    if (activeTab === 'summary') {
      fetchInventory(true)
    } else if (activeTab === 'batches') {
      fetchBatches()
    }
  }

  const loadCatalog = async () => {
    try {
      const res = await dispatch(fetchProducts({ limit: 250 })).unwrap()
      setCatalogProducts(Array.isArray(res) ? res : (res?.products || []))
    } catch (err) {
      console.error(err)
    }
  }

  // ── Data Fetching ───────────────────────────────────────────────────────────

  const fetchSummaryStats = async () => {
    if (!selectedWarehouseId) return
    try {
      const res = await dispatch(fetchWarehouseInventorySummary(selectedWarehouseId)).unwrap()
      setSummaryStats(res)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchInventory = async (forceRefresh = false) => {
    if (!selectedWarehouseId) return

    const cacheKey = `${selectedWarehouseId}_p${summaryPage}_l${summaryLimit}_f${summaryFilter}_s${search}_pid${selectedProductId}`
    const cached = summaryCacheRef.current[cacheKey]
    const now = Date.now()

    if (!forceRefresh && cached && (now - cached.timestamp < 60000)) {
      setInventory(cached.data)
      setSummaryPagination(cached.pagination)
      return
    }

    setLoading(true)
    try {
      const res = await dispatch(fetchWarehouseInventoryRows({
        warehouseId: selectedWarehouseId,
        page: summaryPage,
        limit: summaryLimit,
        filter: summaryFilter,
        search,
        productId: selectedProductId
      })).unwrap()

      const data = res.data || []
      const pagination = res.pagination || { page: 1, limit: 25, total: 0, total_pages: 0 }

      setInventory(data)
      setSummaryPagination(pagination)

      summaryCacheRef.current[cacheKey] = {
        data,
        pagination,
        timestamp: now
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to fetch warehouse inventory', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  const fetchBatches = async () => {
    if (!selectedWarehouseId) return
    setLoading(true)
    try {
      const res = await dispatch(fetchWarehouseBatches({
        warehouseId: selectedWarehouseId,
        page: batchesPage,
        limit: batchesLimit,
        expiring_soon: batchFilter === 'expiring_soon',
        expired_only: batchFilter === 'expired',
        search,
        productId: selectedProductId
      })).unwrap()

      setBatches(res.data || [])
      setBatchesPagination(res.pagination || { page: 1, limit: 25, total: 0, total_pages: 0 })
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to fetch batches', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadWarehouses()
    loadCatalog()
  }, [])

  const refreshActiveTabData = useCallback(() => {
    if (!selectedWarehouseId) return
    fetchSummaryStats()
    if (activeTab === 'summary') {
      fetchInventory(false)
    } else if (activeTab === 'batches') {
      fetchBatches()
    }
  }, [selectedWarehouseId, activeTab, batchesPage, batchesLimit, summaryPage, summaryLimit, selectedProductId])

  const invalidateSummaryCacheAndRefresh = useCallback(() => {
    summaryCacheRef.current = {}
    refreshActiveTabData()
  }, [refreshActiveTabData])

  useEffect(() => {
    refreshActiveTabData()
  }, [refreshActiveTabData])

  // Search/filter trigger for summary tab
  useEffect(() => {
    if (activeTab !== 'summary') return
    fetchInventory(false)
  }, [search, selectedProductId, activeTab, summaryFilter])

  // Search/filter trigger for batches tab
  useEffect(() => {
    if (activeTab !== 'batches') return
    fetchBatches()
  }, [search, selectedProductId, activeTab, batchFilter])

  // Reset pagination indexes on filters change
  useEffect(() => {
    setSummaryPage(1)
  }, [search, selectedProductId, summaryFilter])

  useEffect(() => {
    setBatchesPage(1)
  }, [search, selectedProductId, batchFilter])

  // ── CSV Template Downloads ──────────────────────────────────────────────────
  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "product_code,variant_code,batch_number,qty_received,expiry_date,stock_unit,asl,unit_cost,manufacture_date,best_before_date,reorder_level,reorder_qty\n"
      + `${catalogProducts[0]?.product_code || "PRD-CADBURY-1"},${catalogProducts[0]?.variants?.[0]?.variant_code || "VAR-CADBURY-1-V1"},BATCH-SUP-A,150,29-12-2026,pcs,A2-S3-L1,45.00,15-05-2026,29-11-2026,50,200\n`
      + `${catalogProducts[1]?.product_code || "PRD-AMUL-2"},${catalogProducts[1]?.variants?.[0]?.variant_code || "VAR-AMUL-2-V1"},BATCH-SUP-B,1000,15-08-2026,kg,B1-S2-L2,120.00,01-04-2026,15-07-2026,100,500\n`;

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "warehouse_inventory_pure_batch_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── Filters & Processing for Tab 1 Summary ──────────────────────────────────

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    return d <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
  };

  const processedInventory = useMemo(() => {
    const qLower = search.toLowerCase().trim();
    return inventory.filter(item => {
      // Search Filter
      if (qLower) {
        const product_name = (item.product_name || '').toLowerCase();
        const product_code = (item.product_code || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const brand = (item.brand || item.brand_name || '').toLowerCase();
        if (
          !product_name.includes(qLower) &&
          !product_code.includes(qLower) &&
          !sku.includes(qLower) &&
          !brand.includes(qLower)
        ) return false;
      }
      // Status Filter
      if (summaryFilter === 'low_stock') {
        if (parseFloat(item.available_qty) > parseFloat(item.reorder_level)) return false;
      } else if (summaryFilter === 'expiring_soon') {
        if (!isExpiringSoon(item.nearest_expiry)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Always show expiring-soon items first
      const aExpiring = isExpiringSoon(a.nearest_expiry);
      const bExpiring = isExpiringSoon(b.nearest_expiry);
      if (aExpiring && !bExpiring) return -1;
      if (!aExpiring && bExpiring) return 1;
      return (a.product_name || '').localeCompare(b.product_name || '');
    });
  }, [inventory, search, summaryFilter]);

  const paginatedSummaryData = useMemo(() => {
    return inventory;
  }, [inventory]);

  // Client-side filter for low_stock batches (expiring/expired handled by API)
  const displayedBatches = useMemo(() => {
    if (batchFilter !== 'low_stock') return batches;
    return batches.filter(b => parseFloat(b.qty_available || 0) <= parseFloat(b.reorder_level || 10));
  }, [batches, batchFilter]);

  const lowStockAlertItems = useMemo(() => {
    return inventory.filter(item => parseFloat(item.available_qty) <= parseFloat(item.reorder_level));
  }, [inventory]);


  // ── Restock Modal Form Handlers ─────────────────────────────────────────────

  const handleRestockSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedWarehouseId) return;

    const pkgQty = parseFloat(restockForm.pkgQuantity || 0);
    const factor = parseFloat(restockForm.conversionFactor || 1);
    const computedQty = pkgQty * factor;

    if (isNaN(computedQty) || computedQty <= 0) {
      dispatch(showToast({ message: 'Invalid package quantity or conversion factor', type: 'error' }));
      return;
    }
    if (!restockForm.productId || !restockForm.variantId) {
      dispatch(showToast({ message: 'Catalog Product and Variant references are required.', type: 'error' }));
      return;
    }
    if (!restockForm.batchNumber || !restockForm.batchNumber.trim()) {
      dispatch(showToast({ message: 'Batch Number is strictly required.', type: 'error' }));
      return;
    }
    if (!restockForm.expiryDate || !restockForm.expiryDate.trim()) {
      dispatch(showToast({ message: 'Expiry Date is strictly required.', type: 'error' }));
      return;
    }
    if (!restockForm.manufactureDate || !restockForm.manufactureDate.trim()) {
      dispatch(showToast({ message: 'Manufacture Date is strictly required.', type: 'error' }));
      return;
    }
    if (!restockForm.bestBeforeDate || !restockForm.bestBeforeDate.trim()) {
      dispatch(showToast({ message: 'Best Before Date is strictly required.', type: 'error' }));
      return;
    }
    if (!restockForm.ASL || !restockForm.ASL.trim()) {
      dispatch(showToast({ message: 'ASL Rack Coordinate location is required.', type: 'error' }));
      return;
    }
    if (!restockForm.unitCost || parseFloat(restockForm.unitCost) <= 0) {
      dispatch(showToast({ message: 'Unit Cost is strictly required and must be > 0.', type: 'error' }));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        warehouseId: selectedWarehouseId,
        productId: restockForm.productId,
        quantity: computedQty,
        ASL: restockForm.ASL,
        unitCost: parseFloat(restockForm.unitCost),
        notes: restockForm.notes || `Manual restock: Received ${restockForm.pkgQuantity} ${restockForm.pkgUnit || 'packages'}`,
        extra: {
          variantId: restockForm.variantId,
          batchNumber: restockForm.batchNumber.trim(),
          expiryDate: restockForm.expiryDate,
          manufactureDate: restockForm.manufactureDate,
          bestBeforeDate: restockForm.bestBeforeDate,
          reorderLevel: restockForm.reorderLevel ? parseInt(restockForm.reorderLevel, 10) : 50,
          reorderQty: restockForm.reorderQty ? parseInt(restockForm.reorderQty, 10) : 200
        }
      };

      const res = await dispatch(addWarehouseStock(payload)).unwrap();
      dispatch(showToast({ message: `Received ${computedQty} ${restockForm.stockUnit} stock successfully!`, type: 'success' }));
      setRestockOpen(false);
      setRestockForm(EMPTY_RESTOCK_FORM);
      invalidateSummaryCacheAndRefresh();
    } catch (err) {
      dispatch(showToast({ message: err || 'Error processing restock cargo', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Manual Stock Adjustment (Pure Batch adjustments) ───────────────────────

  const handleAdjustSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedItem) return;

    if (!adjustForm.qtyChange || isNaN(parseFloat(adjustForm.qtyChange))) {
      dispatch(showToast({ message: 'Valid Adjustment count is required', type: 'error' }));
      return;
    }
    if (!adjustForm.reason || !adjustForm.reason.trim()) {
      dispatch(showToast({ message: 'Justified reason is required', type: 'error' }));
      return;
    }

    setSubmitting(true);
    try {
      const res = await dispatch(adjustWarehouseStock({
        batchId: selectedItem.batch_id,
        qtyChange: parseFloat(adjustForm.qtyChange),
        mode: adjustForm.mode,
        reason: adjustForm.reason
      })).unwrap();
      dispatch(showToast({ message: 'Batch stock adjusted successfully!', type: 'success' }));
      setAdjustOpen(false);
      setAdjustForm({ qtyChange: '', mode: 'add', reason: '' });
      invalidateSummaryCacheAndRefresh();
    } catch (err) {
      dispatch(showToast({ message: err || 'Error updating batch stock levels', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Purchase Order Creation Modal Handlers ──────────────────────────────────

  const addPOItemRow = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { variantId: '', qtyOrdered: '', receivingUnit: 'box', unitCost: '' }]
    }));
  };

  const removePOItemRow = (index) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updatePOItemRow = (index, field, value) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleCreatePOSubmit = async () => {
    if (!poForm.supplierId) {
      dispatch(showToast({ message: 'Please select a supplier', type: 'error' }));
      return;
    }
    if (poForm.items.length === 0) {
      dispatch(showToast({ message: 'Please add at least one line item.', type: 'error' }));
      return;
    }

    // Check fields
    for (const item of poForm.items) {
      if (!item.variantId || !item.qtyOrdered || !item.unitCost) {
        dispatch(showToast({ message: 'All fields in line items must be complete.', type: 'error' }));
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post('/warehouse-inventory/purchase-orders', {
        warehouseId: selectedWarehouseId,
        supplierId: poForm.supplierId,
        expectedAt: poForm.expectedAt || null,
        notes: poForm.notes,
        items: poForm.items.map(it => ({
          variantId: it.variantId,
          qtyOrdered: parseFloat(it.qtyOrdered),
          receivingUnit: it.receivingUnit,
          unitCost: parseFloat(it.unitCost)
        }))
      });

      if (res.success) {
        dispatch(showToast({ message: 'Purchase order generated successfully!', type: 'success' }));
        setPoOpen(false);
        setPoForm(EMPTY_PO_FORM);
        invalidateSummaryCacheAndRefresh();
      } else {
        dispatch(showToast({ message: res.message || 'PO creation failed', type: 'error' }));
      }
    } catch (err) {
      dispatch(showToast({ message: 'Error creating Purchase Order.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const advancePOStatus = async (poId, nextStatus) => {
    try {
      const res = await api.post(`/warehouse-inventory/purchase-orders/${poId}/status`, { status: nextStatus });
      if (res.success) {
        dispatch(showToast({ message: `PO status updated to ${nextStatus}`, type: 'success' }));
        fetchPurchaseOrders();
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to update PO status', type: 'error' }));
    }
  };

  // ── Goods Receipt (GRN Wizard Modal) ─────────────────────────────────────────

  const openGRNWizard = async (po) => {
    setSelectedItem(po);
    setLoading(true);
    try {
      const res = await api.get(`/warehouse-inventory/purchase-orders/${po.po_id}`);
      if (res.success) {
        const fullPO = res.data;
        const grnItems = (fullPO.items || []).map(poi => ({
          poItemId: poi.id,
          variantId: poi.variant_id,
          sku: poi.sku || poi.variant_sku,
          productName: poi.product_name,
          variantName: poi.variant_name,
          qtyOrdered: poi.qty_ordered,
          qtyReceivedRaw: '',
          receivingUnit: poi.receiving_unit || 'box',
          conversionFactor: '1',
          batchNumber: '',
          manufactureDate: '',
          expiryDate: '',
          bestBeforeDate: '',
          ASL: '',
          unitCost: poi.unit_cost || '',
          reorderLevel: '50',
          reorderQty: '200'
        }));

        setGrnForm({ invoiceNumber: '', notes: '', items: grnItems });
        setGrnOpen(true);
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to retrieve PO details', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  const updateGRNItemRow = (index, field, value) => {
    setGrnForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleGRNSubmit = async () => {
    if (!grnForm.invoiceNumber) {
      dispatch(showToast({ message: 'Invoice Number is strictly required.', type: 'error' }));
      return;
    }

    // Check mandatory fields
    for (let i = 0; i < grnForm.items.length; i++) {
      const it = grnForm.items[i];
      if (!it.qtyReceivedRaw || parseFloat(it.qtyReceivedRaw) <= 0) {
        dispatch(showToast({ message: `Line ${i + 1}: Valid Quantity Received is required.`, type: 'error' }));
        return;
      }
      if (!it.batchNumber || !it.batchNumber.trim()) {
        dispatch(showToast({ message: `Line ${i + 1}: Batch Number is required.`, type: 'error' }));
        return;
      }
      if (!it.expiryDate || !it.expiryDate.trim()) {
        dispatch(showToast({ message: `Line ${i + 1}: Expiry Date is required.`, type: 'error' }));
        return;
      }
      if (!it.manufactureDate || !it.manufactureDate.trim()) {
        dispatch(showToast({ message: `Line ${i + 1}: Manufacture Date is required.`, type: 'error' }));
        return;
      }
      if (!it.bestBeforeDate || !it.bestBeforeDate.trim()) {
        dispatch(showToast({ message: `Line ${i + 1}: Best Before Date is required.`, type: 'error' }));
        return;
      }
      if (!it.ASL || !it.ASL.trim()) {
        dispatch(showToast({ message: `Line ${i + 1}: Rack Location (ASL) is required.`, type: 'error' }));
        return;
      }
      if (!it.unitCost || parseFloat(it.unitCost) <= 0) {
        dispatch(showToast({ message: `Line ${i + 1}: Unit Cost must be > 0.`, type: 'error' }));
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/warehouse-inventory/purchase-orders/${selectedItem.po_id}/receive`, {
        invoiceNumber: grnForm.invoiceNumber,
        notes: grnForm.notes || 'Supplier arrived with goods',
        items: grnForm.items.map(it => ({
          poItemId: it.poItemId,
          variantId: it.variantId,
          qtyReceivedRaw: parseFloat(it.qtyReceivedRaw),
          receivingUnit: it.receivingUnit,
          conversionFactor: parseFloat(it.conversionFactor || 1),
          batchNumber: it.batchNumber,
          manufactureDate: it.manufactureDate,
          expiryDate: it.expiryDate,
          bestBeforeDate: it.bestBeforeDate,
          ASL: it.ASL,
          unitCost: parseFloat(it.unitCost),
          reorderLevel: parseInt(it.reorderLevel, 10),
          reorderQty: parseInt(it.reorderQty, 10)
        }))
      });

      if (res.success) {
        dispatch(showToast({ message: 'Goods received and batch inventory created successfully!', type: 'success' }));
        setGrnOpen(false);
        invalidateSummaryCacheAndRefresh();
      } else {
        dispatch(showToast({ message: res.message || 'Goods receiving failed', type: 'error' }));
      }
    } catch (err) {
      dispatch(showToast({ message: 'Error registering Goods Receipt Note.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const openGRNPOParse = async (itemsList) => {
    // Maps list parsed from CSV PO directly into PO items form state
    setPoForm(prev => ({
      ...prev,
      items: itemsList.map(it => ({
        variantId: it.variantId,
        qtyOrdered: it.qtyOrdered,
        receivingUnit: it.receivingUnit,
        unitCost: it.unitCost,
        displayName: `[${it.brandName}] ${it.productName} - ${it.variantName}`
      }))
    }))
    setPoOpen(true)
  }

  const openPODetails = async (po) => {
    setLoading(true);
    try {
      const res = await api.get(`/warehouse-inventory/purchase-orders/${po.po_id}`);
      if (res.success) {
        setSelectedItem(res.data);
        setPoDetailOpen(true);
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to retrieve PO details', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // ── Supplier Tab Manual Handlers ────────────────────────────────────────────

  const handleAddSupplierSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!supplierForm.name || !supplierForm.name.trim()) {
      dispatch(showToast({ message: 'Supplier Name is required.', type: 'error' }));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/warehouse-inventory/suppliers', supplierForm);
      if (res.success) {
        dispatch(showToast({ message: 'Supplier created successfully!', type: 'success' }));
        setSupplierAddOpen(false);
        setSupplierForm({ name: '', phone: '', email: '', address: '', gstin: '' });
        loadSuppliers();
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to create supplier.', type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSupplierActiveState = async (supplierId, currentActive) => {
    try {
      const res = await api.patch(`/warehouse-inventory/suppliers/${supplierId}/status`, { active: !currentActive });
      if (res.success) {
        dispatch(showToast({ message: `Supplier status toggled successfully`, type: 'success' }));
        loadSuppliers();
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to change supplier status', type: 'error' }));
    }
  };

  // ── Grid Columns Specifications ──────────────────────────────────────────────

  const summaryColumns = [
    {
      key: 'product_name',
      label: 'Product Name',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 leading-tight">{row.product_name}</div>
          {row.display_size && (
            <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 mt-0.5">{row.display_size}</span>
          )}
        </div>
      )
    },
    { key: 'sku', label: 'SKU' },
    {
      key: 'bulk_stock_qty',
      label: 'Bulk Stock',
      render: (row) => `${parseFloat(row.bulk_stock_qty).toLocaleString()} pcs`
    },
    {
      key: 'reserved_qty',
      label: 'Reserved',
      render: (row) => `${parseFloat(row.reserved_qty).toLocaleString()} pcs`
    },
    {
      key: 'available_qty',
      label: 'Available',
      render: (row) => (
        <span className="font-bold">
          {parseFloat(row.available_qty).toLocaleString()} pcs
        </span>
      )
    },
    {
      key: 'nearest_expiry',
      label: 'Nearest Expiry',
      render: (row) => (
        <span className={new Date(row.nearest_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "text-rose-600 font-bold flex items-center gap-1" : "text-slate-600"}>
          {new Date(row.nearest_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && "⏳"}
          {formatDateDisplay(row.nearest_expiry)}
        </span>
      )
    },
    { key: 'batch_count', label: 'Batches Count' },
    {
      key: 'reorder_level',
      label: 'Reorder Status',
      render: (row) => {
        const isLow = parseFloat(row.available_qty) <= parseFloat(row.reorder_level);
        return (
          <Badge variant={isLow ? 'red' : 'green'}>
            {isLow ? `Low Stock (≤ ${row.reorder_level})` : `Optimal (Min: ${row.reorder_level})`}
          </Badge>
        );
      }
    }
  ];

  const batchColumns = [
    { key: 'batch_number', label: 'Batch No' },
    {
      key: 'product_name',
      label: 'Product',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 leading-tight">{row.product_name}</div>
          {row.display_size && (
            <div className="text-xs text-slate-400 mt-0.5">{row.display_size}</div>
          )}
        </div>
      )
    },
    { key: 'variant_sku', label: 'SKU' },
    { key: 'asl', label: 'ASL Coordinates', render: (row) => <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">{row.asl || row.ASL || '—'}</span> },
    { key: 'qty_received', label: 'Original Received', render: (row) => `${parseFloat(row.qty_received).toLocaleString()} pcs` },
    { key: 'qty_available', label: 'Available Count', render: (row) => <span className="font-bold">{parseFloat(row.qty_available).toLocaleString()} pcs</span> },
    { key: 'unit_cost', label: 'Unit Cost', render: (row) => `₹${parseFloat(row.unit_cost || 0).toFixed(2)}` },
    { key: 'manufacture_date', label: 'MFG Date', render: (row) => formatDateDisplay(row.manufacture_date) },
    { key: 'expiry_date', label: 'Expiry Date', render: (row) => <span className="text-slate-600 font-semibold">{formatDateDisplay(row.expiry_date)}</span> },
    { key: 'best_before_date', label: 'Best Before', render: (row) => formatDateDisplay(row.best_before_date) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSelectedItem(row);
            setAdjustForm({ qtyChange: '', mode: 'add', reason: '' });
            setAdjustOpen(true);
          }}
        >
          ⚖️ Adjust Qty
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Inventory & Batches"
        subtitle="Manage product batches, coordinate rack shelves (ASL Coordinates), and view aggregate stock summaries."
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setBulkOpen(true)}>📤 Bulk Import (CSV)</Button>
          <Button variant="primary" onClick={() => setRestockOpen(true)}>📥 Single Restock</Button>
        </div>
      </PageHeader>

      {/* Facilities/Warehouse Selector Panel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏭</div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Active Storage Facility</h3>
            <p className="text-xs text-gray-400">Inventory levels reflect this warehouse.</p>
          </div>
        </div>
        <div className="w-full md:w-80">
          <Select
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
            className="mb-0 font-bold text-slate-700 cursor-pointer"
          >
            {warehouses.map(w => (
              <option key={w.warehouse_id} value={w.warehouse_id}>
                {w.name} ({w.is_active ? 'Active' : 'Inactive'})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Stats Telemetry Panels */}
      {selectedWarehouseId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total SKUs" value={summaryStats.total_skus} icon="🧬" color="blue" sub="Total unique catalog items stocked" />
          <StatCard label="Active Batches" value={summaryStats.total_batches} icon="📦" color="gray" sub="Total physical batch groups in shelves" />
          <StatCard label="Available Stock" value={summaryStats.total_available.toLocaleString()} icon="📊" color="green" sub="Net sellable units across all batches" />
          <StatCard
            label="Low Stock Alerts"
            value={summaryStats.out_of_stock_skus}
            icon="⚠️"
            color={summaryStats.out_of_stock_skus > 0 ? "red" : "gray"}
            sub="SKUs at or below their reorder level"
            onClick={() => setAlertsOpen(true)}
          />
        </div>
      )}

      {/* Tab Selector Links */}
      <div className="border-b border-gray-100 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-1 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'summary' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            📋 Shelf Summary (VIEW)
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`py-3 px-1 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'batches' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            📦 Individual Batches
          </button>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRefreshData} className="flex items-center gap-1.5 py-1.5 px-3">
          🔄 Refresh
        </Button>
      </div>

      {/* Zepto-style Filter Pill Bar */}
      {selectedWarehouseId && (
        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 flex gap-2" ref={suggestRef}>
              <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 hover:border-primary-300 hover:bg-white transition-all duration-200">
                <span className="text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => {
                    setInputValue(e.target.value)
                    setShowSuggest(true)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleSearch(inputValue)
                    }
                  }}
                  onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
                  placeholder="Search product, SKU, batch, brand..."
                  className="w-full text-sm outline-none bg-transparent font-medium text-slate-700 placeholder-slate-400"
                />
                {suggestLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                )}
                {inputValue && (
                  <button
                    onClick={() => {
                      setInputValue('')
                      handleSearch('')
                    }}
                    className="text-xs text-slate-400 hover:text-rose-500 font-bold shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSearch(inputValue)}
                loading={loading}
                className="py-2.5 px-4 rounded-xl font-bold shrink-0 shadow-sm whitespace-nowrap"
              >
                Search
              </Button>

              {/* Autocomplete Dropdown */}
              {showSuggest && inputValue?.length >= 2 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {suggestions.length > 0 ? (
                    suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={e => {
                          e.preventDefault()
                          handleSelectSuggest(s)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 border-b border-gray-50 last:border-none flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{s.is_brand ? '🏷️' : '🔍'}</span>
                          <span className="font-semibold truncate max-w-[150px] sm:max-w-[200px]">{s.name}</span>
                        </div>
                        {s.is_brand ? (
                          <span className="text-[9px] font-extrabold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Brand</span>
                        ) : s.brand && (
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.brand}</span>
                        )}
                      </button>
                    ))
                  ) : !suggestLoading ? (
                    <div className="px-4 py-3 text-xs text-gray-400 italic">No products matched search</div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Summary Filter Pills */}
            {activeTab === 'summary' && (
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'all', label: 'All', emoji: '📦' },
                  { id: 'expiring_soon', label: 'Expiring Soon', emoji: '⏳' },
                  { id: 'low_stock', label: 'Low Stock', emoji: '⚠️' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSummaryFilter(f.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-150 whitespace-nowrap ${summaryFilter === f.id
                      ? f.id === 'expiring_soon'
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                        : f.id === 'low_stock'
                          ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                          : 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {f.emoji} {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Batch Filter Pills */}
            {activeTab === 'batches' && (
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'expiring_soon', label: 'Expiring Soon', emoji: '⏳' },
                  { id: 'all', label: 'All Batches', emoji: '📦' },
                  { id: 'expired', label: 'Expired', emoji: '🚫' },
                  { id: 'low_stock', label: 'Low Stock', emoji: '⚠️' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setBatchFilter(f.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all duration-150 whitespace-nowrap ${batchFilter === f.id
                      ? f.id === 'expiring_soon'
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                        : f.id === 'expired'
                          ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                          : f.id === 'low_stock'
                            ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                            : 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                      }`}
                  >
                    {f.emoji} {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Layout Panels */}
      {!selectedWarehouseId ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-bold shadow-sm">
          🏭 Please select a warehouse storage facility above.
        </div>
      ) : activeTab === 'batches' ? (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm">Loading batches...</div>
            ) : displayedBatches.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">No batches found for selected filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {batchColumns.map(col => (
                        <th key={col.key} className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedBatches.map((row, i) => {
                      const expiring = row.expiry_date && new Date(row.expiry_date) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                      const expired = row.is_expired || (row.expiry_date && new Date(row.expiry_date) < new Date());
                      return (
                        <tr
                          key={row.batch_id || i}
                          className={`border-b border-slate-50 transition-all ${expired
                            ? 'bg-rose-100/75 text-rose-950 font-medium border-l-4 border-rose-600'
                            : expiring
                              ? 'bg-rose-50/60 text-rose-900 border-l-4 border-rose-400'
                              : 'hover:bg-slate-50/60'
                            }`}
                        >
                          {batchColumns.map(col => (
                            <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                              {col.render ? col.render(row) : (row[col.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationBar
            pagination={{
              page: batchesPagination.page,
              total_pages: batchesPagination.total_pages,
              total: batchesPagination.total,
              limit: batchesPagination.limit
            }}
            onPageChange={setBatchesPage}
            itemsPerPage={batchesLimit}
            setItemsPerPage={setBatchesLimit}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm">Loading inventory...</div>
            ) : paginatedSummaryData.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">No items found matching active filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {summaryColumns.map(col => (
                        <th key={col.key} className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSummaryData.map((row, i) => {
                      const expiring = isExpiringSoon(row.nearest_expiry);
                      return (
                        <tr
                          key={row.variant_id || i}
                          className={`border-b border-slate-50 transition-all ${expiring
                            ? 'bg-rose-50/60 text-rose-900 border-l-4 border-rose-400 font-medium'
                            : 'hover:bg-slate-50/60'
                            }`}
                        >
                          {summaryColumns.map(col => (
                            <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                              {col.render ? col.render(row) : (row[col.key] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <PaginationBar
            pagination={{
              page: summaryPagination.page,
              total_pages: summaryPagination.total_pages,
              total: summaryPagination.total,
              limit: summaryPagination.limit
            }}
            onPageChange={setSummaryPage}
            itemsPerPage={summaryLimit}
            setItemsPerPage={setSummaryLimit}
          />
        </div>
      )}



      {/* ── MODAL: Low Stock Alerts Action Centre ── */}
      <Modal
        title="🚨 Low Stock Alerts Action Centre"
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        size="xl"
        footer={<Button variant="secondary" onClick={() => setAlertsOpen(false)}>Close</Button>}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs flex justify-between items-center">
            <div>
              <p className="font-bold text-red-800 text-sm">Central Warehouse Low Stock Alerts</p>
              <p className="text-red-600 mt-1">
                The following variants are running below their designated safety reorder thresholds. Action is recommended to prevent stockout.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-red-700 bg-red-100 font-extrabold px-3 py-1.5 rounded-full text-xs">
                ⚠️ {lowStockAlertItems.length} SKUs Alerting
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            {lowStockAlertItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-sm">
                🎉 All stock levels are optimal! No low stock alerts active.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">Product details</th>
                      <th className="p-3">SKU / Code</th>
                      <th className="p-3">Current Stock</th>
                      <th className="p-3">Min Threshold</th>
                      <th className="p-3">Deficit</th>
                      <th className="p-3 text-right">Procure Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockAlertItems.map((item, idx) => {
                      const deficit = Math.max(0, parseInt(item.reorder_qty || 200) - parseFloat(item.available_qty));
                      return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{item.product_name}</div>
                            {item.display_size && (
                              <span className="inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 mt-0.5">
                                {item.display_size}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{item.sku}</td>
                          <td className="p-3 text-rose-600 font-black">{parseFloat(item.available_qty).toLocaleString()} pcs</td>
                          <td className="p-3 font-medium text-slate-600">{item.reorder_level} pcs</td>
                          <td className="p-3 font-bold text-amber-600 font-mono">+{deficit.toLocaleString()} pcs</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
                              onClick={() => {
                                setRestockForm({
                                  productId: item.product_id,
                                  variantId: item.variant_id,
                                  variantLabel: `[${item.brand_name || 'Generic'}] ${item.product_name} - ${item.variant_name || item.sku}`,
                                  pkgQuantity: '',
                                  pkgUnit: 'box',
                                  conversionFactor: '50',
                                  stockUnit: 'pcs',
                                  batchNumber: `B-${Date.now().toString().slice(-6)}`,
                                  expiryDate: '',
                                  manufactureDate: '',
                                  bestBeforeDate: '',
                                  ASL: 'A-1-1',
                                  unitCost: '10.00',
                                  reorderLevel: item.reorder_level || '50',
                                  reorderQty: item.reorder_qty || '200'
                                });
                                setAlertsOpen(false);
                                setRestockOpen(true);
                              }}
                            >
                              📥 Quick Intake
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── MODAL: Single Manual Restock ── */}
      <Modal
        title="Receive Cargo Inbound Intake"
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRestockOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleRestockSubmit}>📥 Receive Cargo</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />Catalog Product Reference
            </h4>
            <div className="form-group">
              <label className="label block mb-1">Search Catalog Variant *</label>
              <AutocompleteVariantSelect
                value={restockForm.variantId}
                displayLabel={restockForm.variantLabel}
                onChange={(variantId, displayLabel, v) => {
                  setRestockForm(prev => ({
                    ...prev,
                    productId: v.productId,
                    variantId: variantId,
                    stockUnit: v.stockUnit || 'pcs',
                    variantLabel: displayLabel
                  }));
                }}
              />
            </div>
          </div>

          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />Package delivery & unit conversions
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Quantity *"
                type="number"
                placeholder="60"
                value={restockForm.pkgQuantity}
                onChange={e => setRestockForm(prev => ({ ...prev, pkgQuantity: e.target.value }))}
              />
              <Select
                label="Package Unit *"
                required
                value={restockForm.pkgUnit}
                onChange={e => setRestockForm(prev => ({ ...prev, pkgUnit: e.target.value }))}
              >
                <option value="">-- Choose Unit --</option>
                {PACKAGE_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </Select>
              <Input
                label="Conversion Ratio *"
                type="number"
                placeholder="50"
                value={restockForm.conversionFactor}
                onChange={e => setRestockForm(prev => ({ ...prev, conversionFactor: e.target.value }))}
              />
              <div className="form-group">
                <label className="label">Base stock preview</label>
                <div className="h-10 bg-white border border-slate-200 rounded-lg flex items-center px-3 text-xs font-bold text-slate-600">
                  {restockForm.pkgQuantity && restockForm.conversionFactor ? `${(parseFloat(restockForm.pkgQuantity) * parseFloat(restockForm.conversionFactor)).toLocaleString()} ${restockForm.stockUnit}` : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />Mandatory batch details coordinates
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Batch Number *"
                placeholder="e.g. B-9922"
                value={restockForm.batchNumber}
                onChange={e => setRestockForm(prev => ({ ...prev, batchNumber: e.target.value }))}
              />
              <Input
                label="ASL Coordinates *"
                placeholder="e.g. A-1-2"
                value={restockForm.ASL}
                onChange={e => setRestockForm(prev => ({ ...prev, ASL: e.target.value }))}
              />
              <Input
                label="Unit Cost (₹) *"
                type="number"
                placeholder="15.50"
                value={restockForm.unitCost}
                onChange={e => setRestockForm(prev => ({ ...prev, unitCost: e.target.value }))}
              />
              <Input
                label="Manufacture Date *"
                type="date"
                value={restockForm.manufactureDate}
                onChange={e => setRestockForm(prev => ({ ...prev, manufactureDate: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <Input
                  label="Expiry Date *"
                  type="date"
                  value={restockForm.expiryDate}
                  onChange={e => setRestockForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  label="Best Before Date *"
                  type="date"
                  value={restockForm.bestBeforeDate}
                  onChange={e => setRestockForm(prev => ({ ...prev, bestBeforeDate: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Reorder Min *"
                  type="number"
                  value={restockForm.reorderLevel}
                  onChange={e => setRestockForm(prev => ({ ...prev, reorderLevel: e.target.value }))}
                />
                <Input
                  label="Reorder Qty *"
                  type="number"
                  value={restockForm.reorderQty}
                  onChange={e => setRestockForm(prev => ({ ...prev, reorderQty: e.target.value }))}
                />
              </div>
            </div>

            <Input
              label="Cargo Delivery Notes"
              placeholder="truck number, driver name details..."
              value={restockForm.notes}
              onChange={e => setRestockForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>
      </Modal>



      {/* ── MODAL: Adjust Stock Count ── */}
      {selectedItem && (
        <Modal
          title="Manual Stock Correct Audit"
          open={adjustOpen}
          onClose={() => setAdjustOpen(false)}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setAdjustOpen(false)} disabled={submitting}>Cancel</Button>
              <Button variant="primary" loading={submitting} onClick={handleAdjustSubmit}>⚖️ Adjust Batch</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-indigo-50/20 border border-indigo-100 rounded-lg p-3 text-xs text-slate-700 leading-normal">
              Manually adjusting shelf count for: <strong>{selectedItem.product_name} ({selectedItem.batch_number})</strong>.<br />
              Current Bulk Stock is <span className="font-bold">{selectedItem.qty_available} {selectedItem.stock_unit}</span>.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Correction Mode *"
                value={adjustForm.mode}
                onChange={e => setAdjustForm(prev => ({ ...prev, mode: e.target.value }))}
              >
                <option value="add">➕ Increment (+)</option>
                <option value="subtract">➖ Decrement (-)</option>
                <option value="set">✏️ Set Exact (=)</option>
              </Select>
              <Input
                label="Count *"
                type="number"
                placeholder="Qty delta/absolute"
                value={adjustForm.qtyChange}
                onChange={e => setAdjustForm(prev => ({ ...prev, qtyChange: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Manually Justified Reason *</label>
              <textarea
                required
                className="w-full text-xs p-3 border border-slate-200 rounded-lg outline-none focus:border-primary-400 bg-white"
                placeholder="e.g. Package damaged during logistics, audit count difference verified, etc."
                rows="3"
                value={adjustForm.reason}
                onChange={e => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}



      {/* Reusable Bulk CSV Upload Modal (Inventory Upload) */}
      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Warehouse Inventory"
        schemaFields={SCHEMA_FIELDS}
        fieldValidators={FIELD_VALIDATORS}
        downloadCSVTemplate={downloadCSVTemplate}
        onUpload={async (_, file) => {
          const formData = new FormData()
          formData.append('file', file)
          try {
            const res = await dispatch(bulkUploadWarehouseInventory({ warehouseId: selectedWarehouseId, formData })).unwrap()
            return {
              jobId: res?.jobId,
              totalRows: res?.totalRows,
              created: res?.totalRows,
            }
          } catch (err) {
            return {
              errors: err?.data?.errors?.map(e => `Row ${e.row || '?'}: ${e.field ? e.field + ' ' : ''}${e.message || e.reason || 'Unknown error'}`) || [err?.message || 'CSV failed validation rules.']
            }
          }
        }}
        onDone={() => {
          dispatch(showToast({ message: 'Warehouse bulk upload queued successfully!', type: 'success' }))
          setTimeout(() => invalidateSummaryCacheAndRefresh(), 2000)
        }}
      />


    </div>
  )
}
