// src/pages/Warehouses.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'

const EMPTY = {
  name: '',
  city: 'Visakhapatnam',
  state: 'Andhra Pradesh',
  address: '',
  pincode: '',
  latitude: '',
  longitude: '',
  capacity_sqft: '',
}

export default function Warehouses() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [warehouses, setWarehouses] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/warehouses')
      const json = await res.json()
      if (json.success) setWarehouses(json.data || [])

      const staffRes = await fetch('/api/staff')
      const staffJson = await staffRes.json()
      if (staffJson.success) setStaff(staffJson.data || [])
    } catch (err) {
      console.error('Failed to load data:', err)
      dispatch(showToast({ message: 'Failed to load page data', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Staff is loaded to dynamically resolve manager details on the client side

  const handleEdit = (w) => {
    setEditingWarehouse(w)
    setForm({
      name: w.name || '',
      city: w.city || 'Visakhapatnam',
      state: w.state || 'Andhra Pradesh',
      address: w.address || '',
      pincode: w.pincode || '',
      latitude: String(w.latitude ?? ''),
      longitude: String(w.longitude ?? ''),
      capacity_sqft: String(w.capacity_sqft ?? ''),
    })

    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.city || !form.state || !form.address || !form.pincode) {
      dispatch(showToast({ message: 'All location details are required', type: 'error' })); return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        city: form.city,
        state: form.state,
        address: form.address,
        pincode: form.pincode,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        capacity_sqft: form.capacity_sqft ? parseInt(form.capacity_sqft, 10) : null,
        manager_name: editingWarehouse ? editingWarehouse.manager_name : null,
        manager_phone: editingWarehouse ? editingWarehouse.manager_phone : null,
        manager_email: editingWarehouse ? editingWarehouse.manager_email : null,
      }

      const url = editingWarehouse ? `/api/warehouses/${editingWarehouse.warehouse_id}` : '/api/warehouses'
      const method = editingWarehouse ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        dispatch(showToast({ message: editingWarehouse ? 'Warehouse updated!' : 'Warehouse registered!', type: 'success' }))
        setOpen(false)
        setForm(EMPTY)
        setEditingWarehouse(null)
        loadData()
      } else {
        dispatch(showToast({ message: json.message || 'Operation failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const toggleWarehouseStatus = async (w) => {
    try {
      const res = await fetch(`/api/warehouses/${w.warehouse_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !w.is_active }),
      })
      const json = await res.json()
      if (json.success) {
        dispatch(showToast({ message: 'Status updated!', type: 'success' }))
        loadData()
      } else {
        dispatch(showToast({ message: json.message || 'Failed to update status', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }))
    }
  }

  const columns = [
    {
      key: 'name', label: 'Warehouse',
      render: r => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-xl shrink-0 shadow-sm">
            🏭
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">{r.name}</p>
            <p className="text-[10px] text-gray-400 font-mono">ID: {r.warehouse_id?.slice(0, 8)}</p>
          </div>
        </div>
      )
    },
    {
      key: 'manager', label: 'Manager details',
      render: r => {
        const matchedManager = staff.find(s => s.role === 'warehouse_manager' && s.warehouseId === r.warehouse_id)
        if (matchedManager) {
          return (
            <div className="text-[10px] leading-tight">
              <p className="font-bold text-gray-800">{matchedManager.name}</p>
              <p className="text-gray-500 font-mono mt-0.5">📞 {matchedManager.phone}</p>
              {matchedManager.email && <p className="text-gray-400 mt-0.5">✉️ {matchedManager.email}</p>}
            </div>
          )
        }
        return <span className="text-[10px] text-gray-400 italic">No manager assigned</span>
      }
    },
    {
      key: 'location', label: 'Location',
      render: r => (
        <div className="text-[10px] leading-tight text-gray-500 font-medium">
          <p className="text-gray-700 font-bold uppercase tracking-tight">{r.city}, {r.state}</p>
          <p className="mt-0.5 truncate max-w-xs">{r.address}</p>
          <p className="text-gray-400 mt-0.5 font-mono">{r.pincode}</p>
        </div>
      )
    },
    {
      key: 'capacity', label: 'Capacity',
      render: r => (
        <div className="text-[10px] leading-tight">
          <p className="font-black text-gray-700">{r.capacity_sqft ? `${r.capacity_sqft.toLocaleString()} SQFT` : '—'}</p>
          {(r.latitude || r.longitude) && (
            <p className="text-gray-400 font-mono mt-0.5 text-[9px]">{r.latitude?.slice(0, 7)}, {r.longitude?.slice(0, 7)}</p>
          )}
        </div>
      )
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant={r.is_active ? 'success' : 'gray'} size="sm">{r.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>
    },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(r)}>
            Edit
          </Button>
          <Button
            variant={r.is_active ? 'danger' : 'success'}
            size="sm"
            onClick={() => toggleWarehouseStatus(r)}
          >
            {r.is_active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      )
    }
  ].filter(col => !isSuperAdmin || col.key !== 'actions')

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Warehouses"
        subtitle="Manage central warehouses and facility staff assignments"
        action={!isSuperAdmin && (
          <Button variant="primary" onClick={() => { setForm(EMPTY); setEditingWarehouse(null); setOpen(true) }}>
            + Add Warehouse
          </Button>
        )}
      />

      <Grid
        columns={columns}
        data={warehouses}
        loading={loading}
        searchKey="name"
        emptyText="No warehouses registered yet."
      />

      <Modal
        title={editingWarehouse ? `Edit Warehouse: ${editingWarehouse.name}` : 'Register New Warehouse'}
        open={open}
        onClose={() => { setOpen(false); setEditingWarehouse(null); setForm(EMPTY) }}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editingWarehouse ? 'Update Warehouse' : 'Register Warehouse'}
            </Button>
          </>
        }
      >
        <div className="space-y-8">
          {/* Section 1: Basic Info */}
          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-[8px]">1</span>
              General Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Warehouse Name *" placeholder="Central Warehouse 01" value={form.name} onChange={e => set('name', e.target.value)} />
              <Input label="Capacity (SQFT)" type="number" placeholder="15000" value={form.capacity_sqft} onChange={e => set('capacity_sqft', e.target.value)} />
            </div>
          </section>

          {/* Section 2: Location */}
          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-[8px]">2</span>
              Location Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input label="Full Address *" placeholder="Industrial Area, Gajuwaka" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <Input label="Pincode *" placeholder="530026" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
              <Input label="City *" value={form.city} onChange={e => set('city', e.target.value)} />
              <Input label="State *" value={form.state} onChange={e => set('state', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Latitude" type="number" placeholder="17.xxx" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                <Input label="Longitude" type="number" placeholder="83.xxx" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
              </div>
            </div>
          </section>


        </div>
      </Modal>
    </div>
  )
}
