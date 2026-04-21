// src/pages/Drivers.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMarts, selectAllMarts } from '../store/slices/martSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader    from '../components/PageHeader'
import Button        from '../components/Button'
import Table         from '../components/Table'
import Modal         from '../components/Modal'
import Badge         from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageUpload   from '../components/ImageUpload'
import MartSelector  from '../components/MartSelector'
import useMart       from '../hooks/useMart'
import api           from '../api/index'

const INITIAL = {
  name: '', phone: '', vehicleType: 'bike', vehicleNumber: '',
  mongoMartId: '',
  profileImage:  null,
  licenceImage:  null,   // mandatory
  panImage:      null,   // mandatory
  aadhaarImage:  null,   // mandatory
}

export default function Drivers() {
  const dispatch = useDispatch()
  const marts    = useSelector(selectAllMarts)
  const { activeMartId, selectorProps } = useMart()

  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [form,    setForm]    = useState(INITIAL)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

  useEffect(() => {
    if (!activeMartId) return
    setLoading(true)
    api.get(`/drivers?martId=${activeMartId}`)
      .then(res => { setDrivers(res.data || []); setLoading(false) })
  }, [activeMartId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.name || !form.phone || !form.mongoMartId) {
      dispatch(showToast({ message: 'Name, phone and mart required', type: 'error' }))
      return
    }
    // Mandatory document check
    if (!form.licenceImage) {
      dispatch(showToast({ message: 'Driving licence is mandatory', type: 'error' }))
      return
    }
    if (!form.panImage) {
      dispatch(showToast({ message: 'PAN card is mandatory', type: 'error' }))
      return
    }
    if (!form.aadhaarImage) {
      dispatch(showToast({ message: 'Aadhaar card is mandatory', type: 'error' }))
      return
    }

    setSaving(true)
    const res = await api.post('/drivers', {
      name:          form.name,
      phone:         form.phone,
      vehicleType:   form.vehicleType,
      vehicleNumber: form.vehicleNumber,
      mongoMartId:   form.mongoMartId,
      profileImage:  form.profileImage,
      licenceImage:  form.licenceImage,
      panImage:      form.panImage,
      aadhaarImage:  form.aadhaarImage,
    })
    setSaving(false)
    if (res.success) {
      dispatch(showToast({ message: 'Driver created!', type: 'success' }))
      setOpen(false); setForm(INITIAL)
      api.get(`/drivers?martId=${activeMartId}`).then(r => setDrivers(r.data || []))
    } else {
      dispatch(showToast({ message: res.message || 'Failed', type: 'error' }))
    }
  }

  const statusColor = {
    available: 'green',
    on_trip:   'yellow',
    offline:   'gray',
  }

  // Document link helper
  const DocLink = ({ url, label }) => url
    ? <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline font-medium">{label}</a>
    : <span className="text-xs text-gray-300">{label}</span>

  const columns = [
    { key: 'name', label: 'Driver', render: r => (
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
    )},
    { key: 'vehicle', label: 'Vehicle', render: r => (
      <div>
        <p className="text-sm capitalize">{r.vehicle_type}</p>
        <p className="text-xs text-gray-400">{r.vehicle_number || '—'}</p>
      </div>
    )},
    { key: 'status',           label: 'Status',     render: r => <Badge variant={statusColor[r.status] || 'gray'}>{r.status || 'offline'}</Badge> },
    { key: 'total_deliveries', label: 'Deliveries', render: r => r.total_deliveries || 0 },
    { key: 'total_earnings',   label: 'Earnings',   render: r => `₹${r.total_earnings || 0}` },
    { key: 'documents', label: 'Documents', render: r => (
      <div className="flex gap-2 items-center">
        <DocLink url={r.licence_image}  label="Licence" />
        <span className="text-gray-200">|</span>
        <DocLink url={r.pan_image}      label="PAN" />
        <span className="text-gray-200">|</span>
        <DocLink url={r.aadhaar_image}  label="Aadhaar" />
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Manage delivery drivers"
        action={
          <div className="flex items-center gap-2">
            <MartSelector {...selectorProps} />
            <Button variant="primary" onClick={() => { setForm(INITIAL); setOpen(true) }}>+ Add Driver</Button>
          </div>
        }
      />

      <div className="card">
        {!activeMartId ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">🚴</div>
            <p className="text-gray-400 text-sm">
              {selectorProps.show ? 'Select a mart to view drivers' : 'No mart assigned'}
            </p>
          </div>
        ) : (
          <Table columns={columns} data={drivers} loading={loading} emptyText="No drivers yet" />
        )}
      </div>

      <Modal
        title="Add Driver"
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate}>Add Driver</Button>
          </>
        }
      >
        {/* Profile photo — optional */}
        <ImageUpload
          label="Profile Photo (optional)"
          folder="staff/profile"
          value={form.profileImage}
          onChange={url => set('profileImage', url)}
        />

        <div className="form-grid-2">
          <Input  label="Full Name"      required value={form.name}          onChange={e => set('name', e.target.value)} placeholder="Ravi Kumar" />
          <Input  label="Phone"          required value={form.phone}         onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="9876543210" />
          <Input  label="Vehicle Number"          value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value)} placeholder="AP 31 AB 1234" />
          <Select label="Vehicle Type"   required value={form.vehicleType}   onChange={e => set('vehicleType', e.target.value)}>
            {['bike','scooter','cycle','auto'].map(v => (
              <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </Select>
          <Select label="Mart" required value={form.mongoMartId} onChange={e => set('mongoMartId', e.target.value)}>
            <option value="">Select mart</option>
            {marts.map(m => <option key={m._id||m.id} value={m._id||m.id}>{m.name}</option>)}
          </Select>
        </div>

        {/* Mandatory documents */}
        <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Documents</p>
            <span className="text-xs text-red-500 font-medium">* All mandatory</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Driving Licence */}
            <div className={`p-3 rounded-lg border ${form.licenceImage ? 'border-primary-200 bg-primary-50' : 'border-red-200 bg-red-50'}`}>
              <ImageUpload
                label="Driving Licence *"
                folder="staff/licence"
                value={form.licenceImage}
                onChange={url => set('licenceImage', url)}
              />
              {!form.licenceImage && (
                <p className="text-xs text-red-500 mt-1">Required — upload driving licence</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* PAN Card */}
              <div className={`p-3 rounded-lg border ${form.panImage ? 'border-primary-200 bg-primary-50' : 'border-red-200 bg-red-50'}`}>
                <ImageUpload
                  label="PAN Card *"
                  folder="staff/pan"
                  value={form.panImage}
                  onChange={url => set('panImage', url)}
                />
                {!form.panImage && (
                  <p className="text-xs text-red-500 mt-1">Required</p>
                )}
              </div>

              {/* Aadhaar Card */}
              <div className={`p-3 rounded-lg border ${form.aadhaarImage ? 'border-primary-200 bg-primary-50' : 'border-red-200 bg-red-50'}`}>
                <ImageUpload
                  label="Aadhaar Card *"
                  folder="staff/aadhaar"
                  value={form.aadhaarImage}
                  onChange={url => set('aadhaarImage', url)}
                />
                {!form.aadhaarImage && (
                  <p className="text-xs text-red-500 mt-1">Required</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}