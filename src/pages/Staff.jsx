import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchStaff, createStaff, updateStaff, toggleStaffStatus,
  selectAllStaff, selectStaffLoading, selectStaffError, clearStaffError
} from '../store/slices/staffSlice'
import { fetchMarts, selectAllMarts } from '../store/slices/martSlice'
import { fetchWarehouses, selectAllWarehouses } from '../store/slices/warehouseSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageUpload from '../components/ImageUpload'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'mart_admin', label: 'Mart Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'packing_staff', label: 'Packing Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'support', label: 'Support' },
  { value: 'warehouse_admin', label: 'Warehouse Admin' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'stock_manager', label: 'Stock Manager' },
  { value: 'inbound_staff', label: 'Inbound Staff' },
  { value: 'outbound_staff', label: 'Outbound Staff' },
  { value: 'inventory_auditor', label: 'Inventory Auditor' },
  { value: 'returns_handler', label: 'Returns Handler' },
]

const WAREHOUSE_ROLES = [
  'warehouse_admin',
  'warehouse_manager',
  'dispatcher',
  'stock_manager',
  'inbound_staff',
  'outbound_staff',
  'inventory_auditor',
  'returns_handler'
]

const PLATFORM_ROLES = ['super_admin', 'admin']

const EMPTY = {
  name: '', phone: '', email: '', role: 'mart_admin',
  martId: '', warehouseId: '', basicSalary: '',
  profileImageFile: null, panImageFile: null, aadhaarImageFile: null,
}

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function Staff() {
  const dispatch = useDispatch()
  const staff = useSelector(selectAllStaff)
  const loading = useSelector(selectStaffLoading)
  const error = useSelector(selectStaffError)
  const marts = useSelector(selectAllMarts)
  const warehouses = useSelector(selectAllWarehouses)

  const [open, setOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [martFilter, setMartFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deactivateStaff, setDeactivateStaff] = useState(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  useEffect(() => {
    dispatch(fetchMarts())
    dispatch(fetchStaff())
    dispatch(fetchWarehouses())
  }, [dispatch])

  useEffect(() => {
    if (error) {
      dispatch(showToast({ message: error, type: 'error' }))
      dispatch(clearStaffError())
    }
  }, [error, dispatch])

  const handleRefreshData = () => {
    dispatch(fetchStaff(true))
    dispatch(fetchMarts(true))
    dispatch(fetchWarehouses(true))
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleEdit = (s) => {
    setEditingStaff(s)
    setForm({
      ...EMPTY,
      name: s.name,
      phone: s.phone,
      email: s.email || '',
      role: s.role,
      martId: s.martId || '',
      warehouseId: s.warehouseId || '',
      basicSalary: String(s.basic_salary || ''),
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      dispatch(showToast({ message: 'Name and phone required', type: 'error' })); return
    }
    if (WAREHOUSE_ROLES.includes(form.role)) {
      if (!form.warehouseId) {
        dispatch(showToast({ message: 'Warehouse is required for warehouse staff', type: 'error' })); return
      }
    } else if (!PLATFORM_ROLES.includes(form.role) && !form.martId) {
      dispatch(showToast({ message: 'Mart required for this role', type: 'error' })); return
    }
    // Mandatory images for new staff
    if (!editingStaff && (!form.profileImageFile || !form.panImageFile || !form.aadhaarImageFile)) {
      dispatch(showToast({ message: 'Profile Photo, PAN Card, and Aadhaar Card are all mandatory', type: 'error' })); return
    }

    setSaving(true)
    try {
      const [profileImage, panImage, aadhaarImage] = await Promise.all([
        form.profileImageFile ? toBase64(form.profileImageFile) : Promise.resolve(null),
        form.panImageFile ? toBase64(form.panImageFile) : Promise.resolve(null),
        form.aadhaarImageFile ? toBase64(form.aadhaarImageFile) : Promise.resolve(null),
      ])

      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: form.role,
        martId: (PLATFORM_ROLES.includes(form.role) || WAREHOUSE_ROLES.includes(form.role)) ? null : form.martId,
        warehouseId: WAREHOUSE_ROLES.includes(form.role) ? form.warehouseId : null,
        basicSalary: parseFloat(form.basicSalary) || 0,
        ...(profileImage && { profileImage }),
        ...(panImage && { panImage }),
        ...(aadhaarImage && { aadhaarImage }),
      }

      const action = editingStaff ? updateStaff({ id: editingStaff.id, data: payload }) : createStaff(payload)
      const res = await dispatch(action)

      if (res.error) {
        const errorMsg = res.payload || res.error?.message || 'Failed to save staff'
        dispatch(showToast({ message: errorMsg, type: 'error' }))
      } else {
        dispatch(showToast({ message: editingStaff ? 'Staff updated successfully!' : 'Staff created successfully!', type: 'success' }))
        setOpen(false); setForm(EMPTY); setEditingStaff(null)
      }
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Something went wrong', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'name', label: 'Staff',
      render: r => (
        <div className="flex items-center gap-2 py-1">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0 border border-primary-200">
            {r.profile_image ? <img src={r.profile_image} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-primary-600">{r.name?.charAt(0)?.toUpperCase()}</span>}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-gray-900">{r.name}</p>
            <p className="text-[10px] text-gray-500 font-mono">{r.phone}</p>
            {r.staff_code && (
              <p className="text-[9px] text-primary-600 font-black bg-primary-50/50 px-1 py-0.5 rounded mt-0.5 inline-block border border-primary-100">
                Emp ID: {r.staff_code}
              </p>
            )}
          </div>
        </div>
      )
    },
    { key: 'role', label: 'Role', render: r => <Badge variant="blue" size="xs">{r.role?.replace(/_/g, ' ').toUpperCase()}</Badge> },
    { key: 'status', label: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'gray'} size="xs">{r.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge> },
    {
      key: 'facility', label: 'Facility',
      render: r => {
        if (PLATFORM_ROLES.includes(r.role)) return <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-purple-100">{r.role?.replace(/_/g, ' ').toUpperCase()}</span>
        if (WAREHOUSE_ROLES.includes(r.role)) {
          const w = warehouses.find(w => w.warehouse_id === r.warehouseId)
          return <span className="text-[10px] text-primary-600 font-semibold uppercase tracking-tighter">🏭 {w?.name || 'Warehouse'}</span>
        }
        const m = marts.find(m => m.mongo_mart_id === r.mongo_mart_id || m.id === r.martId)
        return <span className="text-[10px] text-gray-500 font-medium">🏬 {m?.name || '—'}</span>
      }
    },
    { key: 'salary', label: 'Salary', render: r => <span className="text-xs font-bold text-gray-700">₹{parseFloat(r.basic_salary || 0).toLocaleString()}</span> },
    {
      key: 'deactivation_reason',
      label: 'Deactivation Reason',
      render: r => !r.is_active ? (
        <div className="text-[10px] leading-tight">
          <p className="font-bold text-red-500">{r.deactivation_reason || 'No reason specified'}</p>
          {r.deactivated_at && (
            <p className="text-[9px] text-gray-400 font-mono mt-0.5">
              {new Date(r.deactivated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : <span className="text-gray-400">—</span>
    },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex justify-end gap-2">
          <button onClick={() => handleEdit(r)} className="text-[10px] text-gray-600 font-black hover:bg-gray-100 px-2 py-1 rounded transition-colors uppercase tracking-tighter">Edit</button>
          <button 
            onClick={() => {
              if (r.is_active) {
                setDeactivateStaff(r)
              } else {
                dispatch(toggleStaffStatus(r.id))
              }
            }} 
            className={`text-[10px] font-black px-2 py-1 rounded transition-colors uppercase tracking-tighter ${r.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
          >
            {r.is_active ? 'Disable' : 'Enable'}
          </button>
        </div>
      )
    }
  ]

  let filtered = martFilter ? staff.filter(s => s.mongo_mart_id === martFilter) : staff
  if (statusFilter === 'active') {
    filtered = filtered.filter(s => s.is_active)
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(s => !s.is_active)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Staff"
        subtitle="Manage organization workforce"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRefreshData}>
              🔄 Refresh
            </Button>
            <Button variant="primary" onClick={() => { setForm(EMPTY); setEditingStaff(null); setOpen(true) }}>
              + Add Staff Member
            </Button>
          </div>
        }
      />

      <Grid
        columns={columns}
        data={filtered}
        loading={loading}
        searchKey="name"
        actions={
          <div className="flex gap-2 w-full justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2"
            >
              <option value="all">ALL STATUS</option>
              <option value="active">ACTIVE ONLY</option>
              <option value="inactive">INACTIVE ONLY</option>
            </select>
            <select
              value={martFilter}
              onChange={(e) => setMartFilter(e.target.value)}
              className="text-xs font-bold border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 px-3 py-2"
            >
              <option value="">ALL STAFF (ACROSS MARTS)</option>
              {marts.map(m => (
                <option key={m.mongo_mart_id} value={m.mongo_mart_id}>
                  {m.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <Modal open={open} onClose={() => { setOpen(false); setEditingStaff(null); setForm(EMPTY) }} title={editingStaff ? `Edit Staff: ${editingStaff.name}` : "Add Staff Member"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleSave}>{editingStaff ? 'Update Staff' : 'Create Staff'}</Button></>}>
        <div className="space-y-8">
          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-[8px]">1</span>
              Identity Details
            </h4>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0">
                <ImageUpload label="Profile Photo" value={form.profileImageFile} onChange={file => set('profileImageFile', file)} />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name *" placeholder="Ravi Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
                <Input label="Phone *" placeholder="10-digit mobile" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                <Input label="Email Address" placeholder="ravi@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                <Input label="Basic Salary (₹)" type="number" placeholder="15000" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-[8px]">2</span>
              Role & Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="System Role *" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
              {WAREHOUSE_ROLES.includes(form.role) ? (
                <Select label="Assign to Warehouse *" value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
                  <option value="">Select Warehouse</option>
                  {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.name}</option>)}
                </Select>
              ) : !PLATFORM_ROLES.includes(form.role) ? (
                <Select label="Assign to Mart *" value={form.martId} onChange={e => set('martId', e.target.value)}>
                  <option value="">Select Mart</option>
                  {marts.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.mart_code ? `(${m.mart_code})` : ''}
                    </option>
                  ))}
                </Select>
              ) : null}
            </div>
          </section>

          <section className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[8px]">3</span>
              KYC Verification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload label="PAN Card" value={form.panImageFile} onChange={file => set('panImageFile', file)} />
              <ImageUpload label="Aadhaar Card" value={form.aadhaarImageFile} onChange={file => set('aadhaarImageFile', file)} />
            </div>
          </section>
        </div>
      </Modal>

      {/* Deactivation Reason Modal */}
      <Modal
        open={!!deactivateStaff}
        onClose={() => {
          setDeactivateStaff(null)
          setDeactivateReason('')
        }}
        title={`Deactivate Staff: ${deactivateStaff?.name}`}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeactivateStaff(null)
                setDeactivateReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                dispatch(
                  toggleStaffStatus({
                    id: deactivateStaff.id,
                    deactivation_reason: deactivateReason,
                  })
                )
                setDeactivateStaff(null)
                setDeactivateReason('')
              }}
            >
              Confirm Deactivation
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-gray-600 font-medium">
            Please provide a reason for deactivating this staff member. This will be displayed on their profile.
          </p>
          <Input
            label="Deactivation Reason"
            placeholder="e.g. Resigned, Performance issues, Relocation"
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}