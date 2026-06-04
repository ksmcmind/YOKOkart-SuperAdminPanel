// src/pages/StockTransfers.jsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import api from '../api/index'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select, Textarea } from '../components/Input'
import StatCard from '../components/StatCard'

export default function StockTransfers() {
  const dispatch = useDispatch()

  // Base list state
  const [warehouses, setWarehouses] = useState([])
  const [marts, setMarts] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [transfers, setTransfers] = useState([])
  const [warehouseInventory, setWarehouseInventory] = useState([])
  const [loading, setLoading] = useState(false)

  // Dialog configurations
  const [createOpen, setCreateOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [selectedTransfer, setSelectedTransfer] = useState(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all')

  // Forms state
  const [createForm, setCreateForm] = useState({
    martId: '',
    productId: '',
    qtyDispatched: '',
    notes: ''
  })
  
  const [receiveForm, setReceiveForm] = useState({
    qtyReceived: ''
  })

  // Date formatter helper
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Load static catalog lists
  const loadWarehousesAndMarts = async () => {
    try {
      const wRes = await api.get('/warehouses')
      if (wRes.success) {
        const list = wRes.data || []
        setWarehouses(list)
        if (list.length > 0) {
          const activeOnes = list.filter(w => w.is_active)
          const def = activeOnes.length > 0 ? activeOnes[0] : list[0]
          setSelectedWarehouseId(def.warehouse_id)
        }
      }
      const mRes = await api.get('/marts')
      if (mRes.success) {
        setMarts(mRes.data || [])
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to load initial directory data', type: 'error' }))
    }
  }

  // Load transfers for selected warehouse
  const fetchTransfers = async () => {
    if (!selectedWarehouseId) return
    setLoading(true)
    try {
      const res = await api.get(`/warehouse-transfers/warehouse/${selectedWarehouseId}`)
      if (res.success) {
        setTransfers(res.data || [])
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to retrieve transfers list', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  // Load active inventory summary of selected warehouse for the creation modal
  const fetchWarehouseInventory = async () => {
    if (!selectedWarehouseId) return
    try {
      const res = await api.get(`/warehouse-inventory/warehouse/${selectedWarehouseId}?limit=200`)
      if (res.success) {
        setWarehouseInventory(res.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadWarehousesAndMarts()
  }, [])

  useEffect(() => {
    fetchTransfers()
    fetchWarehouseInventory()
  }, [selectedWarehouseId])

  // Filter transfers list by status pill
  const filteredTransfers = useMemo(() => {
    if (statusFilter === 'all') return transfers
    return transfers.filter(t => t.status === statusFilter)
  }, [transfers, statusFilter])

  // Compute stat summary card counts
  const stats = useMemo(() => {
    return {
      total: transfers.length,
      reserved: transfers.filter(t => t.status === 'created').length,
      inTransit: transfers.filter(t => t.status === 'dispatched').length,
      received: transfers.filter(t => t.status === 'received').length,
      cancelled: transfers.filter(t => t.status === 'cancelled').length
    }
  }, [transfers])

  // Create Stock Transfer handler
  const handleCreateTransferSubmit = async () => {
    if (!createForm.martId) {
      dispatch(showToast({ message: 'Please select a destination mart outlet', type: 'error' }))
      return
    }
    if (!createForm.productId) {
      dispatch(showToast({ message: 'Please select a catalog item to transfer', type: 'error' }))
      return
    }
    const qty = parseFloat(createForm.qtyDispatched)
    if (isNaN(qty) || qty <= 0) {
      dispatch(showToast({ message: 'Valid quantity to dispatch is required', type: 'error' }))
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post('/warehouse-transfers', {
        warehouseId: selectedWarehouseId,
        martId: createForm.martId,
        productId: createForm.productId,
        qtyDispatched: qty,
        notes: createForm.notes
      })
      if (res.success) {
        dispatch(showToast({ message: 'Replenishment transfer created and stock reserved!', type: 'success' }))
        setCreateOpen(false)
        setCreateForm({ martId: '', productId: '', qtyDispatched: '', notes: '' })
        fetchTransfers()
        fetchWarehouseInventory()
      } else {
        dispatch(showToast({ message: res.message || 'Creation failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to create replenishment transfer', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  // Dispatch cargo handler
  const handleDispatchCargo = async (transferId) => {
    try {
      const res = await api.patch(`/warehouse-transfers/${transferId}/dispatch`)
      if (res.success) {
        dispatch(showToast({ message: 'Cargo dispatched! Stock levels updated.', type: 'success' }))
        fetchTransfers()
      } else {
        dispatch(showToast({ message: res.message || 'Dispatch failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to dispatch cargo', type: 'error' }))
    }
  }

  // Cancel transfer handler
  const handleCancelTransfer = async (transferId) => {
    try {
      const res = await api.patch(`/warehouse-transfers/${transferId}/cancel`)
      if (res.success) {
        dispatch(showToast({ message: 'Transfer cancelled and reserved stocks released!', type: 'success' }))
        fetchTransfers()
        fetchWarehouseInventory()
      } else {
        dispatch(showToast({ message: res.message || 'Cancellation failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to cancel transfer', type: 'error' }))
    }
  }

  // Receive modal trigger
  const openReceiveWizard = (transfer) => {
    setSelectedTransfer(transfer)
    setReceiveForm({ qtyReceived: String(transfer.qty_dispatched) })
    setReceiveOpen(true)
  }

  // Receive submit handler
  const handleReceiveCargoSubmit = async () => {
    const qty = parseFloat(receiveForm.qtyReceived)
    if (isNaN(qty) || qty <= 0) {
      dispatch(showToast({ message: 'Valid quantity received is required', type: 'error' }))
      return
    }

    setSubmitting(true)
    try {
      const res = await api.patch(`/warehouse-transfers/${selectedTransfer.transfer_id}/receive`, {
        qtyReceived: qty
      })
      if (res.success) {
        dispatch(showToast({ message: 'Restock completed! Mart inventory levels updated.', type: 'success' }))
        setReceiveOpen(false)
        fetchTransfers()
      } else {
        dispatch(showToast({ message: res.message || 'Confirmation failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to complete inbound confirmation', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  // Columns configuration for Grid
  const transferColumns = [
    {
      key: 'transfer_id',
      label: 'Transfer Ticket',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-indigo-600">#TX-{row.transfer_id.slice(0, 6).toUpperCase()}</span>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {formatDateDisplay(row.dispatched_at || row.received_at || row.created_at || Date.now())}
          </p>
        </div>
      )
    },
    {
      key: 'mart_name',
      label: 'Target Outlet',
      render: (row) => <span className="font-semibold text-slate-700">📍 {row.mart_name || 'Quick Mart Outlet'}</span>
    },
    {
      key: 'product_details',
      label: 'Product Details',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800">{row.productName || row.product_name || 'Generic SKU'}</span>
          <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {row.variant_sku || 'N/A'}</p>
        </div>
      )
    },
    {
      key: 'qty_dispatched',
      label: 'Qty Dispatched',
      className: 'text-right',
      render: (row) => <span className="font-bold text-slate-700">{parseFloat(row.qty_dispatched).toLocaleString()}</span>
    },
    {
      key: 'qty_received',
      label: 'Qty Received',
      className: 'text-right',
      render: (row) => (
        <span className="font-bold text-emerald-600">
          {row.qty_received != null ? parseFloat(row.qty_received).toLocaleString() : '—'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Transit Status',
      render: (row) => {
        let badgeCol = 'gray'
        if (row.status === 'received') badgeCol = 'green'
        if (row.status === 'dispatched') badgeCol = 'blue'
        if (row.status === 'created') badgeCol = 'yellow'
        if (row.status === 'cancelled') badgeCol = 'red'
        return <Badge variant={badgeCol}>{row.status.toUpperCase()}</Badge>
      }
    },
    {
      key: 'actions',
      label: 'Operations',
      render: (row) => (
        <div className="flex gap-1.5 justify-end">
          {row.status === 'created' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleCancelTransfer(row.transfer_id)}
              >
                ✕ Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleDispatchCargo(row.transfer_id)}
              >
                🚚 Dispatch
              </Button>
            </>
          )}
          {row.status === 'dispatched' && (
            <Button
              variant="primary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => openReceiveWizard(row)}
            >
              📥 Receive
            </Button>
          )}
          {(row.status === 'received' || row.status === 'cancelled') && (
            <span className="text-xs text-slate-400 font-semibold italic p-1">Archived</span>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers & Replenishments"
        subtitle="Manage outbound warehouse dispatches, allocate cargo items, and confirm inbound mart receipt receipts."
      >
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          ➕ Create Stock Transfer
        </Button>
      </PageHeader>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Tickets', value: stats.total, icon: '📋', border: 'border-slate-100', sub: `${stats.cancelled} cancelled requests` },
          { label: 'Reserved', value: stats.reserved, icon: '🟡', border: 'border-amber-100 bg-amber-50/10', sub: 'Stock allocated in WH' },
          { label: 'In Transit', value: stats.inTransit, icon: '🔵', border: 'border-blue-100 bg-blue-50/10', sub: 'Dispatched and on the road' },
          { label: 'Received', value: stats.received, icon: '🟢', border: 'border-emerald-100 bg-emerald-50/10', sub: 'Cargo checked-in at outlet' }
        ].map((item, idx) => (
          <div key={idx} className={`bg-white border ${item.border} rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow transition-shadow duration-150`}>
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-sm">{item.icon}</span>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-extrabold text-slate-900">{item.value}</span>
              <p className="text-[9px] text-slate-400 font-medium leading-snug mt-1">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Select active Source warehouse */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏭</div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Outbound Source Facility</h3>
            <p className="text-xs text-gray-400">View and raise transfers originating from this warehouse facility.</p>
          </div>
        </div>
        <div className="w-full md:w-80">
          <Select
            value={selectedWarehouseId}
            onChange={e => setSelectedWarehouseId(e.target.value)}
            className="mb-0 font-bold text-slate-700 cursor-pointer"
          >
            {warehouses.map(w => (
              <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Filter status tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-px">
        {['all', 'created', 'dispatched', 'received', 'cancelled'].map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 text-xs font-bold transition-all duration-150 border-b-2 -mb-px ${
              statusFilter === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Transfers Grid */}
      <Grid
        columns={transferColumns}
        data={filteredTransfers}
        loading={loading}
        emptyText="No stock transfer dispatches found."
        pagination={true}
        pageSize={15}
        showSearch={true}
        searchPlaceholder="Search transfers by target, product name, status..."
        searchKey={(item, query) => [item.transfer_id, item.mart_name, item.productName || item.product_name, item.status].some(v => String(v || '').toLowerCase().includes(query))}
      />

      {/* Create Outbound Stock Transfer Modal */}
      <Modal
        title="Initiate Outbound Stock Transfer"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleCreateTransferSubmit}>🚀 Reserve Shipment</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Select
            label="Destination Mart Outlet *"
            required
            value={createForm.martId}
            onChange={e => setCreateForm(prev => ({ ...prev, martId: e.target.value }))}
          >
            <option value="">-- Select Mart Outlet --</option>
            {marts.map(m => (
              <option key={m.id} value={m.id}>📍 {m.name} ({m.city})</option>
            ))}
          </Select>

          <Select
            label="Select In-Stock Product *"
            required
            value={createForm.productId}
            onChange={e => setCreateForm(prev => ({ ...prev, productId: e.target.value }))}
          >
            <option value="">-- Choose Product --</option>
            {warehouseInventory.map(item => {
              const avail = item.available_qty !== undefined ? parseFloat(item.available_qty) : (parseFloat(item.bulk_stock_qty || 0) - parseFloat(item.reserved_qty || 0))
              const prodName = item.product_name || item.productName || 'Generic SKU'
              const brandName = item.brand_name || item.brand || 'Generic'
              const rack = item.asl || item.ASL || 'N/A'
              return (
                <option key={item.variant_id || item.id} value={item.product_id} disabled={avail <= 0}>
                  {prodName} ({brandName}) — Available: {avail} units (ASL: {rack})
                </option>
              )
            })}
          </Select>

          <Input
            label="Quantity to Dispatch *"
            type="number"
            required
            min="1"
            placeholder="e.g. 50"
            value={createForm.qtyDispatched}
            onChange={e => setCreateForm(prev => ({ ...prev, qtyDispatched: e.target.value }))}
          />

          <Textarea
            label="Outbound Cargo Notes"
            placeholder="Assigned driver number, dispatch bin layout notes..."
            value={createForm.notes}
            onChange={e => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>
      </Modal>

      {/* Confirm Mart Receipt Modal */}
      <Modal
        title="Confirm Inbound Mart Receipt"
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiveOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700" loading={submitting} onClick={handleReceiveCargoSubmit}>📥 Confirm Delivery</Button>
          </>
        }
      >
        {selectedTransfer && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Confirm inbound delivery at mart: <strong className="text-slate-800">{selectedTransfer.mart_name}</strong> for item: <strong className="text-slate-800">{selectedTransfer.productName || selectedTransfer.product_name}</strong>.
            </p>

            <Input
              label="Actual Quantity Received *"
              type="number"
              required
              min="1"
              value={receiveForm.qtyReceived}
              onChange={e => setReceiveForm({ qtyReceived: e.target.value })}
            />

            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              Quantity dispatched from warehouse: {parseFloat(selectedTransfer.qty_dispatched).toLocaleString()} units.
            </span>
          </div>
        )}
      </Modal>
    </div>
  )
}
