// src/pages/PurchaseOrders.jsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import api from '../api/index'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import BulkUploadModal from '../components/BulkUploadModal'

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

// Autocomplete variant select helper
function AutocompleteVariantSelect({ value, displayLabel, onChange, placeholder = "Search variant by brand/name/SKU..." }) {
  const [searchVal, setSearchVal] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const q = searchVal.trim()
    if (!q || q.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/products/variants?search=${encodeURIComponent(q)}&limit=25`)
        if (res.success) {
          setSuggestions(res.data?.variants || [])
        }
      } catch (err) {
        console.error('[PO Variant Autocomplete] Failed:', err)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchVal])

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          className="input text-xs w-full font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-primary-500 focus:ring-0 outline-none pr-8"
          placeholder={displayLabel || placeholder}
          value={searchVal}
          onFocus={() => { setFocused(true); setSearchVal(''); }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onChange={e => setSearchVal(e.target.value)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      {focused && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto mt-1 border-t-0 p-1">
          {suggestions.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 font-bold text-center">
              {searchVal.trim().length < 2 ? 'Type at least 2 chars to search...' : 'No catalog variants found.'}
            </div>
          ) : (
            suggestions.map(v => {
              const label = `[${v.brand || 'Generic'}] ${v.productName || v.product_name} - ${v.variantName || v.variant_name || v.sku}`
              return (
                <button
                  key={v.variantId || v.variant_id}
                  type="button"
                  onClick={() => {
                    onChange(v.variantId || v.variant_id, label);
                    setSearchVal('');
                  }}
                  className="w-full text-left text-xs font-semibold text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors duration-150 border-b border-slate-100 flex flex-col gap-0.5"
                >
                  <span className="text-slate-800 font-bold">{label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">SKU: {v.sku} | Prod: {v.product_code || v.productCode}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}


export default function PurchaseOrders() {
  const dispatch = useDispatch()

  const [warehouses, setWarehouses] = useState([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [loading, setLoading] = useState(false)

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

    for (let i = 0; i < grnForm.items.length; i++) {
      const it = grnForm.items[i]
      if (!it.qtyReceivedRaw || parseFloat(it.qtyReceivedRaw) <= 0) {
        dispatch(showToast({ message: `Line ${i + 1}: Valid Quantity Received is required.`, type: 'error' }))
        return
      }
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
      if (!it.unitCost) {
        dispatch(showToast({ message: `Line ${i + 1}: Unit Cost is required.`, type: 'error' }))
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await api.post(`/warehouse-inventory/purchase-orders/${selectedItem.po_id}/receive`, {
        invoiceNumber: grnForm.invoiceNumber,
        notes: grnForm.notes,
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
          {row.status === 'draft' && (
            <Button variant="secondary" size="sm" className="border-yellow-200 text-yellow-600" onClick={() => advancePOStatus(row.po_id, 'sent')}>✉️ Mark Sent</Button>
          )}
          {row.status === 'sent' && (
            <Button variant="secondary" size="sm" className="border-blue-200 text-blue-600" onClick={() => advancePOStatus(row.po_id, 'confirmed')}>👍 Confirm PO</Button>
          )}
          {row.status === 'confirmed' && (
            <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openGRNWizard(row)}>📥 Receive Goods</Button>
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPoBulkOpen(true)}>📤 Bulk PO (CSV)</Button>
          <Button variant="primary" onClick={() => { setPoForm(EMPTY_PO_FORM); setPoOpen(true); }}>➕ Raise Purchase Order</Button>
        </div>
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
        data={purchaseOrders}
        loading={loading}
        emptyText="No Purchase Orders found for this warehouse."
        pagination={true}
        pageSize={15}
        showSearch={true}
        searchPlaceholder="Search POs by PO number, supplier, status..."
        searchKey={(item, query) => [item.po_number, item.supplier_name, item.status].some(v => String(v || '').toLowerCase().includes(query))}
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
        footer={<Button variant="secondary" onClick={() => setPoDetailOpen(false)}>Close</Button>}
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
