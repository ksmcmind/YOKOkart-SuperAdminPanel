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
import Table from '../components/Table'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageUpload from '../components/ImageUpload'
import MartSelector from '../components/MartSelector'
import useMart from '../hooks/useMart'

const INITIAL = {
  name: '',
  phone: '',
  email: '',
  vehicleType: 'bike',
  vehicleNumber: '',
  licenseNumber: '',
  mongoMartId: '',
  profileImageFile: null,
  licenceImageFile: null,
  panImageFile: null,
  aadhaarImageFile: null,
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
    if (!activeMartId) return
    dispatch(fetchDrivers(activeMartId))
  }, [activeMartId, dispatch])

  useEffect(() => {
    if (error) {
      dispatch(showToast({ message: error, type: 'error' }))
      dispatch(clearDriverError())
    }
  }, [error, dispatch])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleClose = () => {
    setOpen(false)
    setEditingDriver(null)
    setForm(INITIAL)
  }

  const handleEdit = (driver) => {
    setEditingDriver(driver)
    setForm({
      name: driver.name || '',
      phone: driver.phone || '',
      email: driver.email || '',
      vehicleType: driver.vehicleType || 'bike',
      vehicleNumber: driver.vehicleNumber || '',
      licenseNumber: driver.licenseNumber || '',
      mongoMartId: driver.mongoMartId || activeMartId || '',
      profileImageFile: null,
      licenceImageFile: null,
      panImageFile: null,
      aadhaarImageFile: null,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.mongoMartId) {
      dispatch(showToast({ message: 'Name, phone and mart required', type: 'error' }))
      return
    }

    // On create — all docs mandatory
    if (!editingDriver) {
      if (!form.licenceImageFile) {
        dispatch(showToast({ message: 'Driving licence is mandatory', type: 'error' })); return
      }
      if (!form.panImageFile) {
        dispatch(showToast({ message: 'PAN card is mandatory', type: 'error' })); return
      }
      if (!form.aadhaarImageFile) {
        dispatch(showToast({ message: 'Aadhaar card is mandatory', type: 'error' })); return
      }
    }

    setSaving(true)
    try {
      // Convert only selected files to base64
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

      let result
      if (editingDriver) {
        result = await dispatch(updateDriver({ id: editingDriver.id, data: payload }))
      } else {
        result = await dispatch(createDriver(payload))
      }

      const action = editingDriver ? updateDriver : createDriver
      if (action.fulfilled.match(result)) {
        dispatch(showToast({
          message: editingDriver ? 'Driver updated!' : 'Driver created!',
          type: 'success',
        }))
        handleClose()
      } else {
        dispatch(showToast({ message: result.payload || 'Failed', type: 'error' }))
      }
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Failed', type: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (driver) => {
    const result = await dispatch(toggleDriverStatus(driver.id))
    if (toggleDriverStatus.fulfilled.match(result)) {
      dispatch(showToast({
        message: `Driver ${driver.isActive ? 'deactivated' : 'activated'}`,
        type: 'success',
      }))
    }
  }

  const statusColor = {
    available: 'green',
    on_trip: 'yellow',
    offline: 'gray',
    suspended: 'red',
  }

  const DocLink = ({ url, label }) => url
    ? <a href={url} target="_blank" rel="noreferrer"
      className="text-xs text-primary-600 hover:underline font-medium">{label}</a>
    : <span className="text-xs text-gray-300">{label}</span>

  const columns = [
    {
      key: 'name', label: 'Driver',
      render: r => (
        <div className="flex items-center gap-2">
          {r.profileImgUrl ? (
            <img src={r.profileImgUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
              {r.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            <p className="text-xs text-gray-400">{r.phone}</p>
            {r.email && <p className="text-xs text-gray-300">{r.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle', label: 'Vehicle',
      render: r => (
        <div>
          <p className="text-sm capitalize">{r.vehicleType}</p>
          <p className="text-xs text-gray-400">{r.vehicleNumber || '—'}</p>
          {r.licenseNumber && <p className="text-xs text-gray-300">{r.licenseNumber}</p>}
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: r => (
        <div className="flex flex-col gap-1">
          <Badge variant={statusColor[r.status] || 'gray'}>{r.status || 'offline'}</Badge>
          <Badge variant={r.isActive ? 'green' : 'gray'} size="sm">
            {r.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'stats', label: 'Stats',
      render: r => (
        <div>
          <p className="text-sm font-medium">{r.totalDeliveries || 0} deliveries</p>
          <p className="text-xs text-gray-400">₹{r.totalEarnings || 0} earned</p>
          <p className="text-xs text-gray-400">₹{r.walletBalance || 0} wallet</p>
        </div>
      ),
    },
    {
      key: 'documents', label: 'Documents',
      render: r => (
        <div className="flex flex-col gap-1">
          <DocLink url={r.licenseImgUrl} label="Licence" />
          <DocLink url={r.kycDocs?.pan} label="PAN" />
          <DocLink url={r.kycDocs?.aadhaar} label="Aadhaar" />
        </div>
      ),
    },
    {
      key: 'verified', label: 'KYC',
      render: r => (
        <Badge variant={r.isVerified ? 'green' : 'yellow'}>
          {r.isVerified ? '✓ Verified' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(r)}>
            Edit
          </Button>
          <Button
            variant={r.isActive ? 'danger-outline' : 'secondary'}
            size="sm"
            onClick={() => handleToggle(r)}
          >
            {r.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Manage delivery drivers"
        action={
          <div className="flex items-center gap-2">
            <MartSelector {...selectorProps} />
            <Button variant="primary" onClick={() => { setForm(INITIAL); setEditingDriver(null); setOpen(true) }}>
              + Add Driver
            </Button>
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
          <Table
            columns={columns}
            data={drivers}
            loading={loading}
            emptyText="No drivers yet"
          />
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      <Modal
        title={editingDriver ? 'Edit Driver' : 'Add Driver'}
        open={open}
        onClose={handleClose}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {saving ? 'Saving...' : editingDriver ? 'Update Driver' : 'Add Driver'}
            </Button>
          </>
        }
      >
        {/* Profile photo — optional */}
        <ImageUpload
          label={editingDriver ? 'Profile Photo (leave empty to keep existing)' : 'Profile Photo (optional)'}
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
            label="Vehicle Number"
            value={form.vehicleNumber}
            onChange={e => set('vehicleNumber', e.target.value)}
            placeholder="AP 31 AB 1234"
          />
          <Input
            label="License Number"
            value={form.licenseNumber}
            onChange={e => set('licenseNumber', e.target.value)}
            placeholder="AP1234567890"
          />
          <Select
            label="Vehicle Type" required
            value={form.vehicleType}
            onChange={e => set('vehicleType', e.target.value)}
          >
            {['bike', 'scooter', 'cycle', 'van'].map(v => (
              <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </Select>
          <Select
            label="Mart" required
            value={form.mongoMartId}
            onChange={e => set('mongoMartId', e.target.value)}
          >
            <option value="">Select mart</option>
            {marts.map(m => (
              <option key={m.id} value={m.mongo_mart_id}>{m.name}</option>
            ))}
          </Select>
        </div>

        {/* Documents */}
        <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Documents</p>
            {!editingDriver && (
              <span className="text-xs text-red-500 font-medium">* All mandatory for new driver</span>
            )}
            {editingDriver && (
              <span className="text-xs text-gray-400">Leave empty to keep existing documents</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Driving Licence */}
            <div className={`p-3 rounded-lg border ${form.licenceImageFile ? 'border-primary-200 bg-primary-50'
                : !editingDriver ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}>
              <ImageUpload
                label={`Driving Licence${!editingDriver ? ' *' : ''}`}
                value={form.licenceImageFile}
                onChange={file => set('licenceImageFile', file)}
              />
              {!form.licenceImageFile && !editingDriver && (
                <p className="text-xs text-red-500 mt-1">Required — upload driving licence</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* PAN Card */}
              <div className={`p-3 rounded-lg border ${form.panImageFile ? 'border-primary-200 bg-primary-50'
                  : !editingDriver ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}>
                <ImageUpload
                  label={`PAN Card${!editingDriver ? ' *' : ''}`}
                  value={form.panImageFile}
                  onChange={file => set('panImageFile', file)}
                />
                {!form.panImageFile && !editingDriver && (
                  <p className="text-xs text-red-500 mt-1">Required</p>
                )}
              </div>

              {/* Aadhaar Card */}
              <div className={`p-3 rounded-lg border ${form.aadhaarImageFile ? 'border-primary-200 bg-primary-50'
                  : !editingDriver ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}>
                <ImageUpload
                  label={`Aadhaar Card${!editingDriver ? ' *' : ''}`}
                  value={form.aadhaarImageFile}
                  onChange={file => set('aadhaarImageFile', file)}
                />
                {!form.aadhaarImageFile && !editingDriver && (
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