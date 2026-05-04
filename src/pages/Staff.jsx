// src/pages/Staff.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchStaff, createStaff, toggleStaffStatus,
  selectAllStaff, selectStaffLoading,
} from '../store/slices/staffSlice'
import { fetchMarts, selectAllMarts } from '../store/slices/martSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageUpload from '../components/ImageUpload'

const ROLES = [
  { value: 'mart_admin', label: 'Mart Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'stock_manager', label: 'Stock Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'packing_staff', label: 'Packing Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'support', label: 'Support' },
]

const EMPTY = {
  name: '', phone: '', email: '', role: 'mart_admin',
  martId: '', basicSalary: '',
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
  const marts = useSelector(selectAllMarts)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [martFilter, setMartFilter] = useState('')

  useEffect(() => {
    dispatch(fetchMarts())
    dispatch(fetchStaff())
  }, [dispatch])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.name || !form.phone) {
      dispatch(showToast({ message: 'Name and phone required', type: 'error' })); return
    }
    if (form.role !== 'super_admin' && !form.martId) {
      dispatch(showToast({ message: 'Mart required for this role', type: 'error' })); return
    }

    setSaving(true)
    try {
      const [profileImage, panImage, aadhaarImage] = await Promise.all([
        form.profileImageFile ? toBase64(form.profileImageFile) : Promise.resolve(null),
        form.panImageFile ? toBase64(form.panImageFile) : Promise.resolve(null),
        form.aadhaarImageFile ? toBase64(form.aadhaarImageFile) : Promise.resolve(null),
      ])

      const res = await dispatch(createStaff({
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: form.role,
        martId: form.martId || null,
        basicSalary: parseFloat(form.basicSalary) || 0,
        profileImage, panImage, aadhaarImage,
      }))

      if (!res.error) {
        dispatch(showToast({ message: 'Staff created!', type: 'success' }))
        setOpen(false); setForm(EMPTY)
      }
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'name', label: 'Staff',
      render: r => (
        <div className="flex items-center gap-2 py-1">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0">
            {r.profile_image ? <img src={r.profile_image} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-primary-600">{r.name?.charAt(0)?.toUpperCase()}</span>}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-gray-900">{r.name}</p>
            <p className="text-[10px] text-gray-500">{r.phone}</p>
          </div>
        </div>
      )
    },
    { key: 'role', label: 'Role', render: r => <Badge variant="blue" size="sm">{r.role?.replace(/_/g, ' ')}</Badge> },
    { key: 'status', label: 'Status', render: r => <Badge variant={r.is_active ? 'success' : 'default'} size="sm">{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'mart', label: 'Mart',
      render: r => {
        if (!r.mongo_mart_id) return <span className="text-[10px] text-purple-600 font-bold uppercase tracking-tighter">Super Admin</span>
        const m = marts.find(m => m.mongo_mart_id === r.mongo_mart_id)
        return <span className="text-[10px] text-gray-500">{m?.name || '—'}</span>
      }
    },
    { key: 'salary', label: 'Salary', render: r => <span className="text-xs font-medium">₹{parseFloat(r.basic_salary || 0).toLocaleString()}</span> },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-2">
          <Button variant={r.is_active ? 'danger' : 'primary'} size="sm" onClick={() => dispatch(toggleStaffStatus(r.id))}>
            {r.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      )
    }
  ]

  const filtered = martFilter ? staff.filter(s => s.mongo_mart_id === martFilter) : staff

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Manage organization workforce"
        action={<Button variant="primary" onClick={() => setOpen(true)}>+ Add Staff Member</Button>}
      />

      <Grid
        columns={columns}
        data={filtered}
        loading={loading}
        searchKey="name"
        actions={
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide max-w-xl">
            <button onClick={() => setMartFilter('')} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${!martFilter ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>ALL STAFF</button>
            {marts.map(m => (
              <button key={m.mongo_mart_id} onClick={() => setMartFilter(m.mongo_mart_id)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${martFilter === m.mongo_mart_id ? 'bg-primary-600 text-white shadow-md shadow-primary-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{m.name.toUpperCase()}</button>
            ))}
          </div>
        }
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Add Staff Member" size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleCreate}>Create Staff Member</Button></>}>
        <div className="space-y-6">
          <section>
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Identity</h4>
            <div className="flex justify-center mb-6">
              <ImageUpload label="Profile Photo" value={form.profileImageFile} onChange={file => set('profileImageFile', file)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name *" placeholder="Ravi Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
              <Input label="Phone *" placeholder="10-digit mobile" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              <Input label="Email Address" placeholder="ravi@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              <Input label="Basic Salary (₹)" type="number" placeholder="15000" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value)} />
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Role & Assignment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="System Role *" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
              <Select label="Assign to Mart *" value={form.martId} onChange={e => set('martId', e.target.value)}>
                <option value="">Select Mart</option>
                {marts.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>
          </section>

          <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">KYC Verification</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUpload label="PAN Card" value={form.panImageFile} onChange={file => set('panImageFile', file)} />
              <ImageUpload label="Aadhaar Card" value={form.aadhaarImageFile} onChange={file => set('aadhaarImageFile', file)} />
            </div>
          </section>
        </div>
      </Modal>
    </div>
  )
}