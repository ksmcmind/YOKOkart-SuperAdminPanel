// src/pages/Drivers.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDrivers, createDriver, updateDriver, toggleDriverStatus,
  selectAllDrivers, selectDriversLoading, selectDriversError,
  clearDriverError,
} from '../store/slices/driverSlice'
import { fetchMarts, selectAllMarts } from '../store/slices/martSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageUpload from '../components/ImageUpload'
import MartSelector from '../components/MartSelector'
import useMart from '../hooks/useMart'

const INITIAL = {
  name: '', phone: '', email: '', vehicleType: 'bike',
  vehicleNumber: '', licenseNumber: '', mongoMartId: '',
  profileImageFile: null, licenceImageFile: null, panImageFile: null, aadhaarImageFile: null,
}

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export default function Drivers() {
  const dispatch = useDispatch()
  const marts = useSelector(selectAllMarts)
  const drivers = useSelector(selectAllDrivers)
  const loading = useSelector(selectDriversLoading)
  const error = useSelector(selectDriversError)
  const { activeMartId, selectorProps } = useMart()

  const [open, setOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(INITIAL)

  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])
  useEffect(() => {
    if (activeMartId) dispatch(fetchDrivers(activeMartId))
  }, [activeMartId, dispatch])

  useEffect(() => {
    if (error) {
      dispatch(showToast({ message: error, type: 'error' }))
      dispatch(clearDriverError())
    }
  }, [error, dispatch])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.mongoMartId) {
      dispatch(showToast({ message: 'Name, phone and mart required', type: 'error' })); return
    }
    
    // On create — all docs mandatory
    if (!editingDriver) {
      if (!form.licenceImageFile || !form.panImageFile || !form.aadhaarImageFile) {
        dispatch(showToast({ message: 'All documents (Licence, PAN, Aadhaar) are mandatory for new drivers', type: 'error' })); return
      }
    }

    setSaving(true)
    try {
      const [profileImage, licenceImage, panImage, aadhaarImage] = await Promise.all([
        form.profileImageFile ? toBase64(form.profileImageFile) : Promise.resolve(null),
        form.licenceImageFile ? toBase64(form.licenceImageFile) : Promise.resolve(null),
        form.panImageFile ? toBase64(form.panImageFile) : Promise.resolve(null),
        form.aadhaarImageFile ? toBase64(form.aadhaarImageFile) : Promise.resolve(null),
      ])

      const payload = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber || undefined,
        licenseNumber: form.licenseNumber || undefined,
        mongoMartId: form.mongoMartId,
        ...(profileImage && { profileImage }),
        ...(licenceImage && { licenceImage }),
        ...(panImage && { panImage }),
        ...(aadhaarImage && { aadhaarImage }),
      }

      const action = editingDriver ? updateDriver({ id: editingDriver.id, data: payload }) : createDriver(payload)
      const res = await dispatch(action)
      if (!res.error) {
        setOpen(false); setForm(INITIAL); setEditingDriver(null)
      }
    } catch (err) {
      dispatch(showToast({ message: err.message, type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const DocLink = ({ url, label }) => url
    ? <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-primary-600 hover:underline font-medium">{label}</a>
    : null

  const columns = [
    {
      key: 'name', label: 'Driver',
      render: r => (
        <div className="flex items-center gap-2 py-1">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0">
            {r.profileImgUrl ? <img src={r.profileImgUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs">👤</span>}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-gray-900">{r.name}</p>
            <p className="text-[10px] text-gray-500">{r.phone}</p>
          </div>
        </div>
      )
    },
    {
      key: 'vehicle', label: 'Vehicle',
      render: r => (
        <div className="text-[10px] leading-tight">
          <p className="capitalize font-medium">{r.vehicleType}</p>
          <p className="text-gray-400">{r.vehicleNumber || '—'}</p>
        </div>
      )
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant={r.status === 'available' ? 'success' : 'default'} size="sm">{r.status || 'offline'}</Badge>
    },
    { key: 'orders', label: 'Orders', render: r => <span className="text-xs font-medium">{r.totalDeliveries || 0}</span> },
    { key: 'earnings', label: 'Earnings', render: r => <span className="text-xs font-medium text-green-600">₹{r.totalEarnings || 0}</span> },
    {
      key: 'documents', label: 'Docs',
      render: r => (
        <div className="flex gap-2">
          <DocLink url={r.licenseImgUrl} label="Lic" />
          <DocLink url={r.kycDocs?.pan} label="PAN" />
          <DocLink url={r.kycDocs?.aadhaar} label="AAD" />
        </div>
      )
    },
    {
      key: 'kyc', label: 'KYC',
      render: r => <span className={r.isVerified ? 'text-green-500' : 'text-orange-500'}>{r.isVerified ? '✓' : '—'}</span>
    },
    {
      key: 'actions', label: '',
      render: r => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditingDriver(r); setForm({ ...r, mongoMartId: r.mongoMartId || activeMartId || '', profileImageFile: null, licenceImageFile: null, panImageFile: null, aadhaarImageFile: null }); setOpen(true) }}>Edit</Button>
          <Button variant={r.isActive ? 'danger' : 'primary'} size="sm" onClick={() => dispatch(toggleDriverStatus(r.id))}>
            {r.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Manage delivery fleet"
        action={
          <div className="flex gap-2">
            <MartSelector {...selectorProps} />
            <Button variant="primary" onClick={() => { setEditingDriver(null); setForm(INITIAL); setOpen(true) }}>+ Add Driver</Button>
          </div>
        }
      />

      <Grid
        columns={columns}
        data={drivers}
        loading={loading}
        emptyText={activeMartId ? "No drivers found" : "Select a mart first"}
        searchKey="name"
      />

      <Modal open={open} onClose={() => { setOpen(false); setEditingDriver(null); setForm(INITIAL); }} 
             title={editingDriver ? `Edit Driver: ${editingDriver.name}` : "Add New Driver"} size="lg"
             footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleSave}>{editingDriver ? 'Update Driver' : 'Create Driver'}</Button></>}>
        <div className="space-y-6">
          <section>
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Basic Information</h4>
            <div className="flex justify-center mb-6">
              <ImageUpload label={editingDriver ? "Update Profile Photo" : "Profile Photo (Optional)"} value={form.profileImageFile} onChange={file => set('profileImageFile', file)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name *" placeholder="e.g. Ravi Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
              <Input label="Phone Number *" placeholder="10-digit number" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              <Input label="Email Address" placeholder="e.g. ravi@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              <Select label="Assign to Mart *" value={form.mongoMartId} onChange={e => set('mongoMartId', e.target.value)}>
                <option value="">Select Mart</option>
                {marts.map(m => <option key={m.id} value={m.mongo_mart_id}>{m.name}</option>)}
              </Select>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Vehicle Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select label="Vehicle Type *" value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)}>
                {['bike', 'scooter', 'cycle', 'van'].map(v => (
                  <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </Select>
              <Input label="Vehicle Number" placeholder="AP 31 AB 1234" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value)} />
              <Input label="License Number" placeholder="DL-..." value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} />
            </div>
          </section>

          <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Verification Documents</h4>
            {!editingDriver && <p className="text-[10px] text-red-500 mb-4 font-bold">* All documents are required for registration</p>}
            {editingDriver && <p className="text-[10px] text-gray-400 mb-4 font-medium">Leave empty to keep existing documents</p>}
            
            <div className="space-y-4">
              <ImageUpload label="Driving Licence *" value={form.licenceImageFile} onChange={file => set('licenceImageFile', file)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ImageUpload label="PAN Card *" value={form.panImageFile} onChange={file => set('panImageFile', file)} />
                <ImageUpload label="Aadhaar Card *" value={form.aadhaarImageFile} onChange={file => set('aadhaarImageFile', file)} />
              </div>
            </div>
          </section>
        </div>
      </Modal>
    </div>
  )
}