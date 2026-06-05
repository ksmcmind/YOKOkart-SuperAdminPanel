// src/pages/Suppliers.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/index'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Textarea } from '../components/Input'
import BulkUploadModal from '../components/BulkUploadModal'

export default function Suppliers() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === 'super_admin'
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusTab, setStatusTab] = useState('active') // 'active' | 'inactive'

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)

  // Forms
  const [form, setForm] = useState({ supplier_code: '', name: '', phone: '', email: '', address: '', gstin: '' })

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const activeParam = statusTab === 'active' ? 'true' : 'false'
      const res = await api.get(`/warehouse-inventory/suppliers?active=${activeParam}`)
      if (res.success) {
        setSuppliers(res.data || [])
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to load suppliers list', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [statusTab])

  const handleAddSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!form.name || !form.name.trim()) {
      dispatch(showToast({ message: 'Supplier Name is required.', type: 'error' }))
      return
    }

    setSubmitting(true)
    try {
      let res
      if (editingSupplier) {
        res = await api.put(`/warehouse-inventory/suppliers/${editingSupplier.supplier_id}`, form)
      } else {
        res = await api.post('/warehouse-inventory/suppliers', form)
      }
      if (res.success) {
        dispatch(showToast({ message: editingSupplier ? 'Supplier updated successfully!' : 'Supplier registered successfully!', type: 'success' }))
        setAddOpen(false)
        setEditingSupplier(null)
        setForm({ supplier_code: '', name: '', phone: '', email: '', address: '', gstin: '' })
        loadSuppliers()
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: editingSupplier ? 'Failed to update supplier' : 'Failed to register supplier', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (supplierId, currentActive) => {
    try {
      const res = await api.patch(`/warehouse-inventory/suppliers/${supplierId}/status`, { active: !currentActive })
      if (res.success) {
        dispatch(showToast({ message: 'Supplier status changed successfully', type: 'success' }))
        loadSuppliers()
      }
    } catch (err) {
      console.error(err)
      dispatch(showToast({ message: 'Failed to toggle supplier status', type: 'error' }))
    }
  }

  const supplierColumns = [
    { key: 'name', label: 'Supplier Name', render: (row) => <span className="font-bold text-slate-800">{row.name}</span> },
    { key: 'supplier_code', label: 'Supplier Code', render: (row) => <span className="font-mono bg-slate-100/50 px-2 py-0.5 rounded text-xs font-semibold text-primary-700">{row.supplier_code || '—'}</span> },
    { key: 'phone', label: 'Contact Phone', render: (row) => row.phone || '—' },
    { key: 'email', label: 'Contact Email', render: (row) => row.email || '—' },
    { key: 'address', label: 'Address', render: (row) => <span className="text-xs text-slate-500 max-w-xs block truncate">{row.address || '—'}</span> },
    { key: 'gstin', label: 'GSTIN Number', render: (row) => <span className="font-mono bg-slate-100/50 px-2 py-0.5 rounded text-xs">{row.gstin || '—'}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge variant={row.is_active ? 'green' : 'red'}>{row.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingSupplier(row)
              setForm({
                supplier_code: row.supplier_code || '',
                name: row.name || '',
                phone: row.phone || '',
                email: row.email || '',
                address: row.address || '',
                gstin: row.gstin || ''
              })
              setAddOpen(true)
            }}
          >
            ✏️ Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={row.is_active ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}
            onClick={() => toggleStatus(row.supplier_id, row.is_active)}
          >
            {row.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      )
    }
  ].filter(col => !isSuperAdmin || col.key !== 'actions')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers Directory"
        subtitle="Manage active supply vendors, contact profiles, and tax identifiers."
      >
        {!isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>📤 Bulk Import (CSV)</Button>
            <Button variant="primary" onClick={() => { setEditingSupplier(null); setForm({ supplier_code: '', name: '', phone: '', email: '', address: '', gstin: '' }); setAddOpen(true); }}>➕ Add Supplier</Button>
          </div>
        )}
      </PageHeader>

      <div className="flex border-b border-gray-100 gap-4">
        <button
          onClick={() => setStatusTab('active')}
          className={`pb-2 px-1 text-sm font-black transition-all border-b-2 ${statusTab === 'active' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          🟢 Active Directory ({statusTab === 'active' ? suppliers.length : '—'})
        </button>
        <button
          onClick={() => setStatusTab('inactive')}
          className={`pb-2 px-1 text-sm font-black transition-all border-b-2 ${statusTab === 'inactive' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          🔴 Inactive Directory ({statusTab === 'inactive' ? suppliers.length : '—'})
        </button>
      </div>

      <Grid
        columns={supplierColumns}
        data={suppliers}
        loading={loading}
        emptyText="No suppliers registered under this status."
        pagination={true}
        pageSize={15}
        showSearch={true}
        searchPlaceholder="Search suppliers by name, code, product, SKU, phone..."
        searchKey={(item, query) => [
          item.name,
          item.supplier_code,
          item.phone,
          item.email,
          item.gstin,
          item.product_names,
          item.variant_skus
        ].some(v => String(v || '').toLowerCase().includes(query))}
      />

      {/* Manual Add/Edit Modal */}
      <Modal
        title={editingSupplier ? "Edit Sourcing Vendor" : "Register Sourcing Vendor"}
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditingSupplier(null); setForm({ supplier_code: '', name: '', phone: '', email: '', address: '', gstin: '' }); }}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAddOpen(false); setEditingSupplier(null); setForm({ supplier_code: '', name: '', phone: '', email: '', address: '', gstin: '' }); }} disabled={submitting}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleAddSubmit}>{editingSupplier ? "💾 Save Changes" : "➕ Register Supplier"}</Button>
          </>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="Supplier Code (Optional - auto-generated if blank)"
            placeholder="e.g. SUP-ITC-001"
            value={form.supplier_code}
            onChange={e => setForm(prev => ({ ...prev, supplier_code: e.target.value }))}
          />
          <Input
            label="Supplier Company Name *"
            required
            placeholder="e.g. ITC Distributors"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              label="Contact Email"
              type="email"
              placeholder="e.g. logistics@itc.com"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <Input
            label="GSTIN Coordinates Number"
            placeholder="e.g. 19CCCCC3333C3Z3"
            value={form.gstin}
            onChange={e => setForm(prev => ({ ...prev, gstin: e.target.value }))}
          />
          <Textarea
            label="Corporate Address"
            placeholder="Factory details coordinates..."
            rows={2}
            value={form.address}
            onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
          />
        </form>
      </Modal>

      {/* Bulk Upload Modal (Enqueues Background Job) */}
      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Sourcing Suppliers"
        schemaFields={['supplier_code', 'name', 'phone', 'email', 'address', 'gstin']}
        fieldValidators={{
          supplier_code: (v) => true,
          name: (v) => v.trim() !== '' || 'Supplier Name is required',
          phone: (v) => true,
          email: (v) => true,
          address: (v) => true,
          gstin: (v) => true
        }}
        downloadCSVTemplate={() => {
          const csvContent = "data:text/csv;charset=utf-8,supplier_code,name,phone,email,address,gstin\n"
            + "SUP-HUL,Hindustan Unilever,9988776655,po@hul.com,HUL Corporate House Mumbai,27BBBBB2222B2Z2\n"
            + "SUP-ITC,ITC Limited,7776665554,orders@itc.in,ITC Center Kolkata,19CCCCC3333C3Z3\n";
          const encodedUri = encodeURI(csvContent)
          const link = document.createElement("a")
          link.setAttribute("href", encodedUri)
          link.setAttribute("download", "suppliers_bulk_template.csv")
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }}
        onUpload={async (_, file) => {
          const formData = new FormData()
          formData.append('file', file)
          const res = await api.post(`/warehouse-inventory/suppliers/bulk`, formData)
          
          if (res.success === false) {
            return {
              errors: [res.message || 'Supplier import failed.']
            }
          }
          return {
            jobId: res.data?.jobId,
            totalRows: res.data?.totalRows,
            created: res.data?.totalRows,
          }
        }}
        onDone={() => {
          setBulkOpen(false)
          dispatch(showToast({ message: 'Suppliers bulk import job queued successfully!', type: 'success' }))
          setTimeout(() => loadSuppliers(), 1500)
        }}
      />
    </div>
  )
}
