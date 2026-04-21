// src/pages/Staff.jsx
// Uses new PG staff table — fields renamed:
//   profileImage → profile_img_url
//   panImage     → kyc_docs.pan
//   aadhaarImage → kyc_docs.aadhaar
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
import Table from '../components/Table'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageInput from '../components/ImageInput'

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
  mongoMartId: '', basicSalary: '',
  profileImage: '', panImage: '', aadhaarImage: '',
}

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
    // Validation
    if (!form.name || !form.phone) {
      dispatch(showToast({ message: 'Name and phone required', type: 'error' }))
      return
    }

    // Super admin doesn't need mart
    if (form.role !== 'super_admin' && !form.mongoMartId) {
      dispatch(showToast({ message: 'Mart required for this role', type: 'error' }))
      return
    }

    setSaving(true)
    const res = await dispatch(createStaff({
      name: form.name,
      phone: form.phone,
      email: form.email,
      role: form.role,
      mongoMartId: form.mongoMartId || null,
      basicSalary: parseFloat(form.basicSalary) || 0,
      profileImage: form.profileImage || null,
      panImage: form.panImage || null,
      aadhaarImage: form.aadhaarImage || null,
    }))
    setSaving(false)

    if (!res.error) {
      dispatch(showToast({ message: 'Staff created!', type: 'success' }))
      setOpen(false)
      setForm(EMPTY)
    } else {
      dispatch(showToast({ message: res.payload || 'Failed to create staff', type: 'error' }))
    }
  }

  const handleToggle = async (id) => {
    const res = await dispatch(toggleStaffStatus(id))
    if (!res.error) {
      dispatch(showToast({ message: 'Status updated', type: 'success' }))
    } else {
      dispatch(showToast({ message: res.payload || 'Update failed', type: 'error' }))
    }
  }

  const filtered = martFilter
    ? staff.filter(s => s.mongo_mart_id === martFilter)
    : staff

  const columns = [
    {
      key: 'name', label: 'Staff',
      render: r => (
        <div className="flex items-center gap-2">
          {r.profile_image ? (
            <img src={r.profile_image} className="w-8 h-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
              {r.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            <p className="text-xs text-gray-400">{r.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', label: 'Role',
      render: r => <Badge variant="blue">{r.role?.replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'is_active', label: 'Status',
      render: r => <Badge variant={r.is_active ? 'green' : 'gray'}>
        {r.is_active ? 'Active' : 'Inactive'}
      </Badge>,
    },
    {
      key: 'mongo_mart_id', label: 'Mart',
      render: r => {
        if (!r.mongo_mart_id) return <span className="text-xs text-purple-600 font-medium">Super Admin</span>
        const mart = marts.find(m => (m._id || m.id) === r.mongo_mart_id)
        return <span className="text-xs text-gray-600">{mart?.name || '—'}</span>
      },
    },
    {
      key: 'basic_salary', label: 'Salary',
      render: r => r.basic_salary ? `₹${parseFloat(r.basic_salary).toLocaleString()}` : '—',
    },
    {
      key: 'kyc_docs', label: 'Docs',
      render: r => (
        <div className="flex gap-1">
          {r.kyc_docs?.pan && (
            <a href={r.kyc_docs.pan} target="_blank" rel="noreferrer"
              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">
              PAN
            </a>
          )}
          {r.kyc_docs?.aadhaar && (
            <a href={r.kyc_docs.aadhaar} target="_blank" rel="noreferrer"
              className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100">
              Aadhaar
            </a>
          )}
          {!r.kyc_docs?.pan && !r.kyc_docs?.aadhaar && (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <Button
          variant={r.is_active ? 'danger' : 'primary'}
          size="sm"
          onClick={() => handleToggle(r.id)}
        >
          {r.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Manage all mart staff members"
        action={<Button variant="primary" onClick={() => setOpen(true)}>+ Add Staff</Button>}
      />

      {/* Mart filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setMartFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!martFilter ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
        >
          All ({staff.length})
        </button>
        {marts.map(m => {
          const count = staff.filter(s => s.mongo_mart_id === (m._id || m.id)).length
          return (
            <button
              key={m._id || m.id}
              onClick={() => setMartFilter(m._id || m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${martFilter === (m._id || m.id) ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
                }`}
            >
              {m.name} ({count})
            </button>
          )
        })}
      </div>

      <div className="card">
        <Table columns={columns} data={filtered} loading={loading} emptyText="No staff yet." />
      </div>

      <Modal
        title="Add Staff Member"
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpen(false); setForm(EMPTY) }}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleCreate}>
              Add Staff
            </Button>
          </>
        }
      >
        {/* Profile Image URL */}
        <ImageInput
          label="Profile Photo URL (optional)"
          value={form.profileImage}
          onChange={v => set('profileImage', v)}
          placeholder="Paste GCS URL"
        />

        <div className="form-grid-2">
          <Input
            label="Full Name" required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Ravi Kumar"
          />
          <Input
            label="Phone" required
            value={form.phone}
            onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
          />
          <Input
            label="Email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="ravi@example.com"
          />
          <Input
            label="Basic Salary (₹)" type="number"
            value={form.basicSalary}
            onChange={e => set('basicSalary', e.target.value)}
            placeholder="15000"
          />
          <Select
            label="Role" required
            value={form.role}
            onChange={e => set('role', e.target.value)}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <Select
            label={form.role === 'super_admin' ? 'Mart (not required)' : 'Mart'}
            required={form.role !== 'super_admin'}
            value={form.mongoMartId}
            onChange={e => set('mongoMartId', e.target.value)}
            disabled={form.role === 'super_admin'}
          >
            <option value="">{form.role === 'super_admin' ? 'No mart (super admin)' : 'Select mart'}</option>
            {marts.map(m => (
              <option key={m._id || m.id} value={m._id || m.id}>{m.name}</option>
            ))}
          </Select>
        </div>

        {/* Document URLs */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            KYC Documents (Optional)
          </p>
          <ImageInput
            label="PAN Card URL"
            value={form.panImage}
            onChange={v => set('panImage', v)}
            placeholder="Paste PAN GCS URL"
          />
          <ImageInput
            label="Aadhaar Card URL"
            value={form.aadhaarImage}
            onChange={v => set('aadhaarImage', v)}
            placeholder="Paste Aadhaar GCS URL"
          />
        </div>
      </Modal>
    </div>
  )
}