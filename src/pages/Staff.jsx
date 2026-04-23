// src/pages/Staff.jsx
// Images are held as File objects in form state.
// On submit, all three files are converted to base64 and uploaded
// in parallel via api.post('/upload/image'), then the resolved URLs
// are sent together with the staff payload in a single createStaff call.

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
  mongoMartId: '', basicSalary: '',
  profileImageFile: null,  // File | null
  panImageFile: null,  // File | null
  aadhaarImageFile: null,  // File | null
}



// Converts a File to base64 data URL  e.g. "data:image/jpeg;base64,..."
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

  const handleClose = () => {
    setOpen(false)
    setForm(EMPTY)
  }

  const handleCreate = async () => {
    if (!form.name || !form.phone) {
      dispatch(showToast({ message: 'Name and phone required', type: 'error' }))
      return
    }
    if (form.role !== 'super_admin' && !form.mongoMartId) {
      dispatch(showToast({ message: 'Mart required for this role', type: 'error' }))
      return
    }

    setSaving(true)
    try {
      // Convert File objects to base64 data URLs, then send as plain JSON
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
        mongoMartId: form.mongoMartId || null,
        basicSalary: parseFloat(form.basicSalary) || 0,
        profileImage,
        panImage,
        aadhaarImage,
      }))

      if (!res.error) {
        dispatch(showToast({ message: 'Staff created!', type: 'success' }))
        handleClose()
      } else {
        dispatch(showToast({ message: res.payload || 'Failed to create staff', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Failed', type: 'error' }))
    } finally {
      setSaving(false)
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
      render: r => (
        <Badge variant={r.is_active ? 'green' : 'gray'}>
          {r.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'mongo_mart_id', label: 'Mart',
      render: r => {
        if (!r.mongo_mart_id)
          return <span className="text-xs text-purple-600 font-medium">Super Admin</span>
        const mart = marts.find(m => m.mongo_mart_id === r.mongo_mart_id)
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

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setMartFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!martFilter ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
        >
          All ({staff.length})
        </button>
        {marts.map(m => {
          const count = staff.filter(s => s.mongo_mart_id === m.mongo_mart_id).length
          return (
            <button
              key={m.mongo_mart_id}
              onClick={() => setMartFilter(m.mongo_mart_id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${martFilter === m.mongo_mart_id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
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
        onClose={handleClose}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate}>
              {saving ? 'Uploading & Saving...' : 'Add Staff'}
            </Button>
          </>
        }
      >
        <ImageUpload
          label="Profile Photo (optional)"
          value={form.profileImageFile}
          onChange={file => set('profileImageFile', file)}
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
            <option value="">
              {form.role === 'super_admin' ? 'No mart (super admin)' : 'Select mart'}
            </option>
            {marts.map(m => (
              <option key={m.mongo_mart_id} value={m.mongo_mart_id}>{m.name}</option>
            ))}
          </Select>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            KYC Documents (Optional)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${form.panImageFile ? 'border-primary-200 bg-primary-50' : 'border-red-200 bg-red-50'
              }`}>
              <ImageUpload
                label="PAN Card *"
                value={form.panImageFile}
                onChange={file => set('panImageFile', file)}
              />
              {!form.panImageFile && (
                <p className="text-xs text-red-500 mt-1">Required</p>
              )}
            </div>

            <div className={`p-3 rounded-lg border ${form.aadhaarImageFile ? 'border-primary-200 bg-primary-50' : 'border-red-200 bg-red-50'
              }`}>
              <ImageUpload
                label="Aadhaar Card *"
                value={form.aadhaarImageFile}
                onChange={file => set('aadhaarImageFile', file)}
              />
              {!form.aadhaarImageFile && (
                <p className="text-xs text-red-500 mt-1">Required</p>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}