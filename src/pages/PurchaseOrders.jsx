// src/pages/PurchaseOrders.jsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/index'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select, Textarea } from '../components/Input'
import BulkUploadModal from '../components/BulkUploadModal'
import AutocompleteVariantSelect from '../components/AutocompleteVariantSelect'

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

const EMPTY_PO_FORM = {
  supplierId: '',
  expectedAt: '',
  notes: '',
  items: []
}



export default function PurchaseOrders() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('') // '' = All

  // Dialog configurations
  const [poOpen, setPoOpen] = useState(false)
  const [poBulkOpen, setPoBulkOpen] = useState(false)
  const [grnOpen, setGrnOpen] = useState(false)
  const [poDetailOpen, setPoDetailOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedItem, setSelectedItem] = useState(null)
  
  // Catalogs
  const [suppliers, setSuppliers] = useState([])

  // Forms
  const [poForm, setPoForm] = useState(EMPTY_PO_FORM)
  const [grnForm, setGrnForm] = useState({ invoiceNumber: '', notes: '', items: [] })

  // Edit Receipt State
  const [editReceiptOpen, setEditReceiptOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [editReceiptForm, setEditReceiptForm] = useState({
    qtyReceivedRaw: '',
    unitCost: '',
    invoiceNumber: '',
    batchNumber: '',
    ASL: '',
    manufactureDate: '',
    expiryDate: '',
    bestBeforeDate: '',
    notes: ''
  })

  const toInputDate = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return d.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const openEditReceiptWizard = (receipt) => {
    setSelectedReceipt(receipt)
    setEditReceiptForm({
      qtyReceivedRaw: receipt.qty_received_raw || '',
      unitCost: receipt.unit_cost || '',
      invoiceNumber: receipt.invoice_number || '',
      batchNumber: receipt.batch_number || '',
      ASL: receipt.asl || '',
      manufactureDate: toInputDate(receipt.manufacture_date),
      expiryDate: toInputDate(receipt.expiry_date),
      bestBeforeDate: toInputDate(receipt.best_before_date),
      notes: receipt.notes || ''
    })
    setEditReceiptOpen(true)
  }

  const handleEditReceiptSubmit = async () => {
    if (!selectedReceipt) return

    const qty = parseFloat(editReceiptForm.qtyReceivedRaw)
    if (isNaN(qty) || qty < 0) {
      dispatch(showToast({ message: 'Valid quantity received is required', type: 'error' }))
      return
    }

    if (!editReceiptForm.batchNumber || !editReceiptForm.batchNumber.trim()) {
      dispatch(showToast({ message: 'Batch Number is required', type: 'error' }))
      return
    }

    if (!editReceiptForm.ASL || !editReceiptForm.ASL.trim()) {
      dispatch(showToast({ message: 'ASL Location is required', type: 'error' }))
      return
    }

    if (!editReceiptForm.expiryDate) {
      dispatch(showToast({ message: 'Expiry Date is required', type: 'error' }))
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        qtyReceivedRaw: qty,
        unitCost: parseFloat(editReceiptForm.unitCost || 0),
        invoiceNumber: editReceiptForm.invoiceNumber,
        batchNumber: editReceiptForm.batchNumber,
        ASL: editReceiptForm.ASL,
        manufactureDate: editReceiptForm.manufactureDate || null,
        expiryDate: editReceiptForm.expiryDate,
        bestBeforeDate: editReceiptForm.bestBeforeDate || null,
        notes: editReceiptForm.notes
      }

      const res = await api.put(`/warehouse-inventory/purchase-orders/receipts/${selectedReceipt.receipt_id}`, payload)
      if (res.success) {
        dispatch(showToast({ message: 'Stock receipt updated successfully!', type: 'success' }))
        setEditReceiptOpen(false)
        
        // Refresh the detail modal content
        if (selectedItem) {
          const detailRes = await api.get(`/warehouse-inventory/purchase-orders/${selectedItem.po_id}`)
          if (detailRes.success) {
            setSelectedItem(detailRes.data)
          }
        }
        
        // Refresh the PO list
        fetchPurchaseOrders()
      } else {
        dispatch(showToast({ message: res.message || 'Update failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to update stock receipt', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

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

  const loadWarehouses = async () => {
    try {
      const res = await api.get('/warehouses')
      if (res.success) {
        const list = res.data || []
        setWarehouses(list)
        if (list.length > 0) {
          const activeOnes = list.filter(w => w.is_active)
          const def = activeOnes.length > 0 ? activeOnes[0] : list[0]
          setSelectedWarehouseId(def.warehouse_id)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadSuppliers = async () => {
    try {
      const res = await api.get('/warehouse-inventory/suppliers?active=true')
      if (res.success) {
        setSuppliers(res.data || [])
      }
    } catch (err) {}
  }

  const fetchPurchaseOrders = async () => {
    if (!selectedWarehouseId) return
    setLoading(true)
    try {
      const res = await api.get(`/warehouse-inventory/purchase-orders?warehouseId=${selectedWarehouseId}`)
      if (res.success) {
        setPurchaseOrders(res.data || [])
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to load purchase orders', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWarehouses()
    loadSuppliers()
  }, [])

  useEffect(() => {
    fetchPurchaseOrders()
  }, [selectedWarehouseId])

  const addPOItemRow = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { variantId: '', displayLabel: '', qtyOrdered: '', receivingUnit: 'box', unitCost: '' }]
    }))
  }

  const removePOItemRow = (index) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updatePOItemRow = (index, field, value) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  const handleCreatePOSubmit = async () => {
    if (!poForm.supplierId) {
      dispatch(showToast({ message: 'Please select a supplier', type: 'error' }))
      return
    }
    if (poForm.items.length === 0) {
      dispatch(showToast({ message: 'Add at least one line item.', type: 'error' }))
      return
    }

    for (const item of poForm.items) {
      if (!item.variantId || !item.qtyOrdered || !item.unitCost) {
        dispatch(showToast({ message: 'Complete all item details.', type: 'error' }))
        return
      }
    }

    setSubmitting(true)
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
      })

      if (res.success) {
        dispatch(showToast({ message: 'PO raised successfully!', type: 'success' }))
        setPoOpen(false)
        setPoForm(EMPTY_PO_FORM)
        fetchPurchaseOrders()
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to create Purchase Order', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  const advancePOStatus = async (poId, nextStatus) => {
    try {
      const res = await api.post(`/warehouse-inventory/purchase-orders/${poId}/status`, { status: nextStatus })
      if (res.success) {
        dispatch(showToast({ message: `PO status updated to ${nextStatus}`, type: 'success' }))
        fetchPurchaseOrders()
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to update PO status', type: 'error' }))
    }
  }

  const openGRNWizard = async (po) => {
    setSelectedItem(po)
    setLoading(true)
    try {
      const res = await api.get(`/warehouse-inventory/purchase-orders/${po.po_id}`)
      if (res.success) {
        const fullPO = res.data
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
        }))
        setGrnForm({ invoiceNumber: '', notes: '', items: grnItems })
        setGrnOpen(true)
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to retrieve PO details', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  const updateGRNItemRow = (index, field, value) => {
    setGrnForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }))
  }

  const handleGRNSubmit = async () => {
    if (!grnForm.invoiceNumber) {
      dispatch(showToast({ message: 'Invoice Number is required.', type: 'error' }))
      return
    }

    let atLeastOneReceived = false;
    for (let i = 0; i < grnForm.items.length; i++) {
      const it = grnForm.items[i]
      const qty = parseFloat(it.qtyReceivedRaw || 0)
      if (qty <= 0) {
        continue
      }

      atLeastOneReceived = true

      if (!it.batchNumber) {
        dispatch(showToast({ message: `Line ${i + 1}: Batch Number is required.`, type: 'error' }))
        return
      }
      if (!it.expiryDate) {
        dispatch(showToast({ message: `Line ${i + 1}: Expiry Date is required.`, type: 'error' }))
        return
      }
      if (!it.manufactureDate) {
        dispatch(showToast({ message: `Line ${i + 1}: Manufacture Date is required.`, type: 'error' }))
        return
      }
      if (!it.bestBeforeDate) {
        dispatch(showToast({ message: `Line ${i + 1}: Best Before Date is required.`, type: 'error' }))
        return
      }
      if (!it.ASL) {
        dispatch(showToast({ message: `Line ${i + 1}: ASL Coordinates is required.`, type: 'error' }))
        return
      }
      if (!it.unitCost || parseFloat(it.unitCost) <= 0) {
        dispatch(showToast({ message: `Line ${i + 1}: Unit Cost must be > 0.`, type: 'error' }))
        return
      }
    }

    if (!atLeastOneReceived) {
      dispatch(showToast({ message: 'Please receive at least one item with a valid quantity.', type: 'error' }))
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post(`/warehouse-inventory/purchase-orders/${selectedItem.po_id}/receive`, {
        invoiceNumber: grnForm.invoiceNumber,
        notes: grnForm.notes,
        items: grnForm.items.map(it => ({
          poItemId: it.poItemId,
          variantId: it.variantId,
          qtyReceivedRaw: parseFloat(it.qtyReceivedRaw || 0),
          receivingUnit: it.receivingUnit,
          conversionFactor: parseFloat(it.conversionFactor || 1),
          batchNumber: it.batchNumber || null,
          manufactureDate: it.manufactureDate || null,
          expiryDate: it.expiryDate || null,
          bestBeforeDate: it.bestBeforeDate || null,
          ASL: it.ASL || null,
          unitCost: parseFloat(it.unitCost || 0),
          reorderLevel: parseInt(it.reorderLevel || 50, 10),
          reorderQty: parseInt(it.reorderQty || 200, 10)
        }))
      })

      if (res.success) {
        dispatch(showToast({ message: 'Goods received successfully into batches!', type: 'success' }))
        setGrnOpen(false)
        fetchPurchaseOrders()
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to process goods receipt note', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  const openPOParsedData = (itemsList) => {
    setPoForm(prev => ({
      ...prev,
      items: itemsList.map(it => ({
        variantId: it.variantId,
        displayLabel: `[${it.brandName || 'Generic'}] ${it.productName} - ${it.variantName || it.sku}`,
        qtyOrdered: it.qtyOrdered,
        receivingUnit: it.receivingUnit,
        unitCost: it.unitCost
      }))
    }))
    setPoOpen(true)
  }

  const openPODetails = async (po) => {
    setLoading(true)
    try {
      const res = await api.get(`/warehouse-inventory/purchase-orders/${po.po_id}`)
      if (res.success) {
        setSelectedItem(res.data)
        setPoDetailOpen(true)
      }
    } catch (err) {
      dispatch(showToast({ message: 'Failed to retrieve PO details', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  const poColumns = [
    { key: 'po_number', label: 'PO Number', render: (row) => <span className="font-mono font-bold text-indigo-600">{row.po_number}</span> },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'expected_at', label: 'Expected At', render: (row) => formatDateDisplay(row.expected_at) },
    { key: 'total_amount', label: 'Est. Total', render: (row) => `₹${parseFloat(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    {
      key: 'status',
      label: 'PO Status',
      render: (row) => {
        let badgeCol = 'gray'
        if (row.status === 'completed') badgeCol = 'green'
        if (row.status === 'confirmed') badgeCol = 'blue'
        if (row.status === 'sent') badgeCol = 'yellow'
        if (row.status === 'cancelled') badgeCol = 'red'
        return <Badge variant={badgeCol}>{row.status.toUpperCase()}</Badge>
      }
    },
    { key: 'staff_name', label: 'Raised By', render: (row) => row.staff_name || 'Admin' },
    {
      key: 'actions',
      label: 'Actions Wizard',
      render: (row) => (
        <div className="flex gap-1.5 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => openPODetails(row)}>👁️ View</Button>
          {!isSuperAdmin && row.status === 'draft' && (
            <Button variant="secondary" size="sm" className="border-yellow-200 text-yellow-600" onClick={() => advancePOStatus(row.po_id, 'sent')}>✉️ Mark Sent</Button>
          )}
          {!isSuperAdmin && row.status === 'sent' && (
            <Button variant="secondary" size="sm" className="border-blue-200 text-blue-600" onClick={() => advancePOStatus(row.po_id, 'confirmed')}>👍 Confirm PO</Button>
          )}
          {!isSuperAdmin && row.status === 'confirmed' && (
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openGRNWizard(row)}>📥 Receive Goods</Button>
          )}
          {!isSuperAdmin && ['draft', 'sent', 'confirmed'].includes(row.status) && (
            <Button variant="secondary" size="sm" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => advancePOStatus(row.po_id, 'cancelled')}>🚫 Cancel</Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders & GRN"
        subtitle="Raise procurement POs, manage vendor timelines, and execute physical supplier Goods Receipts."
      >
        {!isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPoBulkOpen(true)}>📤 Bulk PO (CSV)</Button>
            <Button variant="primary" onClick={() => { setPoForm(EMPTY_PO_FORM); setPoOpen(true); }}>➕ Raise Purchase Order</Button>
          </div>
        )}
      </PageHeader>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏭</div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Receiving Warehouse</h3>
            <p className="text-xs text-gray-400">POs will be raised and received into this warehouse.</p>
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

      <Grid
        columns={poColumns}
        data={statusFilter ? purchaseOrders.filter(po => po.status === statusFilter) : purchaseOrders}
        loading={loading}
        emptyText="No Purchase Orders found for this warehouse."
        pagination={true}
        pageSize={15}
        showSearch={true}
        searchPlaceholder="Search POs by PO number, supplier, product, SKU..."
        searchKey={(item, query) => [
          item.po_number,
          item.supplier_name,
          item.status,
          item.product_names,
          item.variant_skus
        ].some(v => String(v || '').toLowerCase().includes(query))}
        actions={
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              height: '42px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              color: statusFilter ? '#1e293b' : '#94a3b8',
              background: 'white',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '150px',
              fontWeight: statusFilter ? '600' : '400'
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="partially_received">Partially Received</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      />

      {/* Manual Raise Modal */}
      <Modal
        title="Raise Purchase Order (PO)"
        open={poOpen}
        onClose={() => setPoOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPoOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleCreatePOSubmit}>➕ Raise PO</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Supplier *"
              required
              value={poForm.supplierId}
              onChange={e => setPoForm(prev => ({ ...prev, supplierId: e.target.value }))}
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map(s => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
              ))}
            </Select>
            <Input
              label="Expected Delivery Date"
              type="date"
              value={poForm.expectedAt}
              onChange={e => setPoForm(prev => ({ ...prev, expectedAt: e.target.value }))}
            />
          </div>
          <Input
            label="Procurement Notes"
            placeholder="Special delivery directives..."
            value={poForm.notes}
            onChange={e => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
          />

          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Line Items List</h4>
              <Button variant="secondary" size="sm" onClick={addPOItemRow}>➕ Add Item</Button>
            </div>

            {poForm.items.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-semibold">No products added yet.</p>
            ) : (
              <div className="space-y-3">
                {poForm.items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative pr-8">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 block mb-1">Search Catalog Variant *</label>
                      <AutocompleteVariantSelect
                        value={it.variantId}
                        displayLabel={it.displayLabel}
                        onChange={(varId, label) => {
                          updatePOItemRow(idx, 'variantId', varId);
                          updatePOItemRow(idx, 'displayLabel', label);
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        label="Qty *"
                        type="number"
                        placeholder="100"
                        className="mb-0"
                        value={it.qtyOrdered}
                        onChange={e => updatePOItemRow(idx, 'qtyOrdered', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <Select
                        label="PO Unit *"
                        value={it.receivingUnit}
                        className="mb-0 text-xs"
                        onChange={e => updatePOItemRow(idx, 'receivingUnit', e.target.value)}
                      >
                        {PACKAGE_UNITS.map(pu => (
                          <option key={pu.value} value={pu.value}>{pu.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        label="Unit Cost (₹) *"
                        type="number"
                        placeholder="45.00"
                        className="mb-0"
                        value={it.unitCost}
                        onChange={e => updatePOItemRow(idx, 'unitCost', e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => removePOItemRow(idx)}
                      className="absolute top-1/2 -translate-y-1/2 right-2 text-rose-500 text-lg hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Receive Goods Note Modal (GRN Wizard) */}
      <Modal
        title="Supplier Arrival Goods Receipt (GRN Wizard)"
        open={grnOpen}
        onClose={() => setGrnOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setGrnOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" loading={submitting} onClick={handleGRNSubmit}>📥 Process Goods Receipt</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {selectedItem && (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">PO Number: <span className="text-indigo-600">{selectedItem.po_number}</span></p>
                <p className="text-slate-400 mt-1">Supplier: <strong>{selectedItem.supplier_name}</strong></p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">Expected Delivery:</p>
                <p className="font-bold text-slate-800">{formatDateDisplay(selectedItem.expected_at)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Supplier Invoice Number *"
              required
              placeholder="e.g. INV-998877"
              value={grnForm.invoiceNumber}
              onChange={e => setGrnForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            />
            <Input
              label="Inbound Delivery Notes"
              placeholder="Carrier truck coordinate notes..."
              value={grnForm.notes}
              onChange={e => setGrnForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ordered items receiving details</h4>
            <div className="space-y-4">
              {grnForm.items.map((it, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <p className="font-bold text-xs text-slate-800">{it.productName} — {it.variantName} ({it.sku})</p>
                    <Badge variant="blue">Ordered: {parseFloat(it.qtyOrdered).toLocaleString()} {it.receivingUnit}(s)</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input
                      label="Qty Received *"
                      type="number"
                      placeholder="e.g. 60"
                      value={it.qtyReceivedRaw}
                      onChange={e => updateGRNItemRow(idx, 'qtyReceivedRaw', e.target.value)}
                    />
                    <Select
                      label="Unit *"
                      value={it.receivingUnit}
                      onChange={e => updateGRNItemRow(idx, 'receivingUnit', e.target.value)}
                    >
                      {PACKAGE_UNITS.map(pu => (
                        <option key={pu.value} value={pu.value}>{pu.label}</option>
                      ))}
                    </Select>
                    <Input
                      label="Conversion Ratio *"
                      type="number"
                      placeholder="e.g. 50"
                      value={it.conversionFactor}
                      onChange={e => updateGRNItemRow(idx, 'conversionFactor', e.target.value)}
                    />
                    <div className="form-group">
                      <label className="label">Base stock preview</label>
                      <div className="h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center px-3 text-xs font-bold text-slate-600">
                        {it.qtyReceivedRaw && it.conversionFactor ? `${(parseFloat(it.qtyReceivedRaw) * parseFloat(it.conversionFactor)).toLocaleString()} pcs` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Input
                      label="Batch Number *"
                      placeholder="e.g. B2-ITC-99"
                      value={it.batchNumber}
                      onChange={e => updateGRNItemRow(idx, 'batchNumber', e.target.value)}
                    />
                    <Input
                      label="ASL coordinates (rack coordinates location) *"
                      placeholder="A-2-3"
                      value={it.ASL}
                      onChange={e => updateGRNItemRow(idx, 'ASL', e.target.value)}
                    />
                    <Input
                      label="Unit Cost (₹) *"
                      type="number"
                      placeholder="120.00"
                      value={it.unitCost}
                      onChange={e => updateGRNItemRow(idx, 'unitCost', e.target.value)}
                    />
                    <Input
                      label="Manufacture Date *"
                      type="date"
                      value={it.manufactureDate}
                      onChange={e => updateGRNItemRow(idx, 'manufactureDate', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <Input
                        label="Expiry Date *"
                        type="date"
                        value={it.expiryDate}
                        onChange={e => updateGRNItemRow(idx, 'expiryDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        label="Best Before Date *"
                        type="date"
                        value={it.bestBeforeDate}
                        onChange={e => updateGRNItemRow(idx, 'bestBeforeDate', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Reorder Min *"
                        type="number"
                        value={it.reorderLevel}
                        onChange={e => updateGRNItemRow(idx, 'reorderLevel', e.target.value)}
                      />
                      <Input
                        label="Reorder Qty *"
                        type="number"
                        value={it.reorderQty}
                        onChange={e => updateGRNItemRow(idx, 'reorderQty', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* PO Detail View Modal */}
      <Modal
        title="Purchase Order Details"
        open={poDetailOpen}
        onClose={() => setPoDetailOpen(false)}
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            {selectedItem && ['draft', 'sent', 'confirmed'].includes(selectedItem.status) ? (
              <Button
                variant="secondary"
                size="sm"
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  advancePOStatus(selectedItem.po_id, 'cancelled');
                  setPoDetailOpen(false);
                }}
              >
                🚫 Cancel Purchase Order
              </Button>
            ) : (
              <div />
            )}
            <Button variant="secondary" onClick={() => setPoDetailOpen(false)}>Close</Button>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400">PO Number / Status</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedItem.po_number} — <Badge>{selectedItem.status.toUpperCase()}</Badge></p>
              </div>
              <div>
                <p className="text-slate-400">Raised Date</p>
                <p className="font-bold text-slate-800 mt-0.5">{formatDateDisplay(selectedItem.raised_at)}</p>
              </div>
              <div>
                <p className="text-slate-400">Supplier Name</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedItem.supplier_name}</p>
              </div>
              <div>
                <p className="text-slate-400">Notes</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedItem.notes || '—'}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Item lines ordered</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Ordered Qty</th>
                      <th className="p-3">Received Qty</th>
                      <th className="p-3 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedItem.items || []).map((poi, pIdx) => (
                      <tr key={pIdx} className="border-b border-slate-200/50">
                        <td className="p-3 font-semibold text-slate-800">{poi.product_name} — {poi.variant_name}</td>
                        <td className="p-3 font-mono">{parseFloat(poi.qty_ordered).toLocaleString()} {poi.receiving_unit}</td>
                        <td className="p-3 font-mono">{parseFloat(poi.qty_received).toLocaleString()} {poi.receiving_unit}</td>
                        <td className="p-3 text-right font-bold text-slate-700">₹{(parseFloat(poi.qty_ordered) * parseFloat(poi.unit_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receipts Log Section */}
            {selectedItem.receipts && selectedItem.receipts.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Stock Receipt Logs (GRN)</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <tr>
                        <th className="p-3">Receipt Info</th>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Qty Received</th>
                        <th className="p-3">Batch & ASL</th>
                        <th className="p-3">Logs & Audits</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.receipts.map((rc, rcIdx) => (
                        <tr key={rcIdx} className="border-b border-slate-200/50">
                          <td className="p-3 font-semibold text-slate-800">
                            <div>#RC-{rc.receipt_id.slice(0, 6).toUpperCase()}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Inv: {rc.invoice_number || 'N/A'}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{rc.product_name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{rc.variant_name} (SKU: {rc.variant_sku})</div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono">{parseFloat(rc.qty_received_raw).toLocaleString()} {rc.receiving_unit}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">({parseFloat(rc.qty_in_stock_unit).toLocaleString()} pcs)</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-700">Batch: {rc.batch_number || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">ASL: {rc.asl || 'N/A'} | Exp: {formatDateDisplay(rc.expiry_date)}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-[10px] text-slate-500">Recv by: <strong className="text-slate-700">{rc.received_by_name || 'Admin'}</strong></div>
                            {rc.edited_by && (
                              <div className="text-[9px] text-amber-600 font-semibold mt-1">
                                Edited by: {rc.edited_by_name || 'Admin'} on {formatDateDisplay(rc.edited_at)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => openEditReceiptWizard(rc)}
                            >
                              ✏️ Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Stock Receipt Modal */}
      <Modal
        title="Edit Stock Receipt Details"
        open={editReceiptOpen}
        onClose={() => setEditReceiptOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditReceiptOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleEditReceiptSubmit}>💾 Save Changes</Button>
          </>
        }
      >
        {selectedReceipt && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <p className="font-semibold text-slate-800">
                Editing Receipt: <span className="font-mono text-indigo-600">#RC-{selectedReceipt.receipt_id.slice(0, 6).toUpperCase()}</span>
              </p>
              <p className="text-slate-400 mt-1">Item: {selectedReceipt.product_name} ({selectedReceipt.variant_sku})</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`Qty Received (${selectedReceipt.receiving_unit || 'pcs'}) *`}
                type="number"
                required
                min="0"
                value={editReceiptForm.qtyReceivedRaw}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, qtyReceivedRaw: e.target.value }))}
              />
              <Input
                label="Unit Cost (₹) *"
                type="number"
                required
                min="0"
                value={editReceiptForm.unitCost}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, unitCost: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Invoice Number"
                placeholder="e.g. INV-998"
                value={editReceiptForm.invoiceNumber}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              />
              <Input
                label="Batch Number *"
                required
                placeholder="e.g. BATCH-001"
                value={editReceiptForm.batchNumber}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, batchNumber: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="ASL Location *"
                required
                placeholder="e.g. A-1-2"
                value={editReceiptForm.ASL}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, ASL: e.target.value }))}
              />
              <Input
                label="Manufacture Date"
                type="date"
                value={editReceiptForm.manufactureDate}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, manufactureDate: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Date *"
                type="date"
                required
                value={editReceiptForm.expiryDate}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
              <Input
                label="Best Before Date"
                type="date"
                value={editReceiptForm.bestBeforeDate}
                onChange={e => setEditReceiptForm(prev => ({ ...prev, bestBeforeDate: e.target.value }))}
              />
            </div>

            <Textarea
              label="Notes"
              placeholder="Reason for correction..."
              value={editReceiptForm.notes}
              onChange={e => setEditReceiptForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>
        )}
      </Modal>

      {/* PO Bulk CSV Upload Modal */}
      <BulkUploadModal
        open={poBulkOpen}
        onClose={() => setPoBulkOpen(false)}
        title="Bulk Import Purchase Orders"
        schemaFields={['supplier_code', 'expected_date', 'product_code', 'variant_code', 'qty_ordered', 'receiving_unit', 'unit_cost']}
        fieldValidators={{
          supplier_code: (v) => v.trim() !== '' || 'Supplier Code is required',
          expected_date: (v) => true,
          product_code: (v) => v.trim() !== '' || 'Product Code is required',
          variant_code: (v) => v.trim() !== '' || 'Variant Code is required',
          qty_ordered: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be a number > 0',
          receiving_unit: (v) => true,
          unit_cost: (v) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be a number > 0',
        }}
        downloadCSVTemplate={() => {
          const csvContent = "data:text/csv;charset=utf-8,supplier_code,expected_date,product_code,variant_code,qty_ordered,receiving_unit,unit_cost\n"
            + "SUP-CADBURY,2026-06-10,PRD-CADBURY-1,VAR-CADBURY-1-V1,150,box,45.50\n"
            + "SUP-AMUL,2026-06-12,PRD-AMUL-2,VAR-AMUL-2-V1,500,carton,120.00\n"
          const encodedUri = encodeURI(csvContent)
          const link = document.createElement("a")
          link.setAttribute("href", encodedUri)
          link.setAttribute("download", "purchase_order_bulk_template.csv")
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }}
        onUpload={async (_, file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('warehouseId', selectedWarehouseId)
          const res = await api.post(`/warehouse-inventory/purchase-orders/bulk-parse`, formData)
          
          if (res.success === false) {
            return {
              errors: [res.message || 'File parsing failed. Please verify catalog and supplier codes.']
            }
          }

          if (res.data && res.data.createdDirectly) {
            return {
              totalRows: res.data.totalRows,
              created: res.data.count,
            }
          } else {
            openPOParsedData(res.data)
            return {
              totalRows: res.data?.length,
              created: res.data?.length,
            }
          }
        }}
        onDone={() => {
          setPoBulkOpen(false)
          dispatch(showToast({ message: 'POs processed successfully!', type: 'success' }))
          fetchPurchaseOrders()
        }}
      />
    </div>
  )
}
