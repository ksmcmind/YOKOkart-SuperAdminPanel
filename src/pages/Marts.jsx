// src/pages/Marts.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchMarts, createMart, toggleMartStatus, updateMart,
  selectAllMarts, selectMartsLoading,
} from '../store/slices/martSlice'
import { fetchStaff, selectAllStaff } from '../store/slices/staffSlice'
import { fetchWarehouses, selectAllWarehouses } from '../store/slices/warehouseSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageInput from '../components/Imageinput'

const EMPTY = {
  pg_mart_id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  pincode: '',
  city: 'Visakhapatnam',
  lat: '',
  lng: '',
  serviceRadius: '5000',
  minOrderValue: '99',
  deliveryFee: '20',
  freeDeliveryAbove: '299',
  openingTime: '08:00',
  closingTime: '22:00',
  coveragePincodes: '',
  gstin: '',
  gstPercentage: '0',
  logo: '',
  banner: '',
  banners: [],
  operational_notice: '',
  warehouse_id: '',
  razorpay_id: '',
}

const statusVariant = (status) => ({
  open: 'success',
  closed: 'default',
  busy: 'warning',
  maintenance: 'danger',
}[status] || 'default')

export default function Marts() {
  const dispatch = useDispatch()
  const marts = useSelector(selectAllMarts)
  const loading = useSelector(selectMartsLoading)
  const user = useSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingMart, setEditingMart] = useState(null)
  const [saving, setSaving] = useState(false)
  const warehouses = useSelector(selectAllWarehouses)
  const staff = useSelector(selectAllStaff)

  useEffect(() => {
    dispatch(fetchMarts())
    dispatch(fetchWarehouses())
    dispatch(fetchStaff())
  }, [dispatch])

  const handleRefreshData = () => {
    dispatch(fetchMarts(true))
    dispatch(fetchWarehouses(true))
    dispatch(fetchStaff())
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleOpenEdit = (mart) => {
    setEditingMart(mart)
    setForm({
      ...EMPTY,
      pg_mart_id: mart.mart_code || '',
      name: mart.name || '',
      phone: mart.phone || '',
      email: mart.email || '',
      address: mart.address || '',
      city: mart.city || 'Visakhapatnam',
      pincode: mart.pincode || '',
      gstin: mart.gstin || '',
      logo: mart.logo || '',
      banner: mart.banner || '',
      banners: mart.banners || [],
      operational_notice: mart.operational_notice || '',
      lat: String(mart.lat ?? ''),
      lng: String(mart.lng ?? ''),
      serviceRadius: String(mart.service_radius || 5000),
      minOrderValue: String(mart.min_order_value || 99),
      deliveryFee: String(mart.delivery_fee || 20),
      freeDeliveryAbove: String(mart.free_delivery_above || 299),
      gstPercentage: String(mart.gst_percentage || 0),
      openingTime: mart.opening_time?.slice(0, 5) || '08:00',
      closingTime: mart.closing_time?.slice(0, 5) || '22:00',
      coveragePincodes: Array.isArray(mart.coverage_pincodes)
        ? mart.coverage_pincodes.join(', ')
        : '',
      warehouse_id: mart.warehouse_id || '',
      razorpay_id: mart.razorpay_id || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.lat || !form.lng) {
      dispatch(showToast({ message: 'Name, Phone, and Coordinates are required', type: 'error' }))
      return
    }

    setSaving(true)

    // ✅ FIX: all camelCase form fields correctly mapped to snake_case backend fields
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      pincode: form.pincode,
      gstin: form.gstin,
      logo: form.logo,
      banner: form.banner,
      banners: form.banners,
      operational_notice: form.operational_notice,
      pg_mart_id: form.pg_mart_id,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      service_radius: parseInt(form.serviceRadius) || 5000,
      min_order_value: parseFloat(form.minOrderValue) || 99,
      delivery_fee: parseFloat(form.deliveryFee) || 20,
      free_delivery_above: parseFloat(form.freeDeliveryAbove) || 299,  // ✅ FIX: was form.free_delivery_above
      opening_time: form.openingTime,                            // ✅ FIX: was missing
      closing_time: form.closingTime,                            // ✅ FIX: was missing
      gst_percentage: parseFloat(form.gstPercentage) || 0,
      coverage_pincodes: form.coveragePincodes
        ? form.coveragePincodes.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      warehouse_id: form.warehouse_id || null,
      razorpay_id: form.razorpay_id || null,
    }

    const action = editingMart
      ? updateMart({ id: editingMart.id, data: payload })
      : createMart(payload)

    const res = await dispatch(action)
    setSaving(false)
    if (!res.error) {
      setModalOpen(false)
      dispatch(showToast({ message: editingMart ? 'Mart updated' : 'Mart created', type: 'success' }))
    }
  }

  const addBanner = () => set('banners', [...(form.banners || []), { image_url: '', action_type: 'category', action_value: '', is_active: true }])
  const removeBanner = (idx) => set('banners', form.banners.filter((_, i) => i !== idx))
  const updateBanner = (idx, field, val) => {
    const next = [...form.banners]
    next[idx] = { ...next[idx], [field]: val }
    set('banners', next)
  }

  const columns = [
    {
      key: 'name', label: 'Mart', render: r => (
        <div className="flex items-center gap-3 py-1">
          <img src={r.logo || '/placeholder.png'} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-gray-100" alt="" />
          <div>
            <p className="font-bold text-gray-900 leading-tight">{r.name}</p>
            <p className="text-[10px] text-gray-500 font-mono">#{r.mart_code || r.id?.slice(-8)}</p>
          </div>
        </div>
      )
    },
    {
      key: 'contact', label: 'Contact', render: r => (
        <div className="text-[10px] leading-tight">
          <p className="font-bold text-gray-700">{r.phone}</p>
          <p className="text-gray-400">{r.email || '—'}</p>
        </div>
      )
    },
    {
      key: 'manager', label: 'Manager details',
      render: r => {
        const matchedManager = staff.find(s => (s.role === 'manager' || s.role === 'mart_admin') && s.martId === r.id)
        const name = matchedManager?.name || r.manager_name
        const phone = matchedManager?.phone || r.manager_phone
        const email = matchedManager?.email || r.manager_email
        
        if (name) {
          return (
            <div className="text-[10px] leading-tight">
              <p className="font-bold text-gray-800">{name}</p>
              {phone && <p className="text-gray-500 font-mono mt-0.5">📞 {phone}</p>}
              {email && <p className="text-gray-400 mt-0.5">✉️ {email}</p>}
            </div>
          )
        }
        return <span className="text-[10px] text-gray-400 italic">No manager assigned</span>
      }
    },
    {
      key: 'logistics', label: 'Financials', render: r => (
        <div className="text-[10px] leading-tight">
          <p className="text-gray-600">Min Order: <span className="font-bold text-gray-800">₹{r.min_order_value}</span></p>
          <p className="text-gray-400">Del: ₹{r.delivery_fee} (Free @ ₹{r.free_delivery_above})</p>
        </div>
      )
    },
    {
      key: 'location', label: 'Location', render: r => (
        <div className="text-[10px] leading-tight text-gray-500 font-medium uppercase tracking-tighter">
          <p className="text-gray-700 font-bold">{r.city}</p>
          <p className="mt-0.5">{r.pincode}</p>
        </div>
      )
    },
    {
      key: 'warehouse', label: 'Warehouse', render: r => {
        const whMatched = warehouses.find(w => w.warehouse_id === r.warehouse_id);
        if (whMatched) {
          return (
            <div className="text-[10px] leading-tight py-1 flex items-center gap-1.5 font-semibold text-primary-600">
              <span className="text-sm shrink-0">🏭</span>
              <span className="truncate max-w-[120px]">{whMatched.name}</span>
            </div>
          );
        }
        return <span className="text-[10px] text-gray-400 italic">No warehouse linked</span>;
      }
    },
    {
      key: 'hours', label: 'Hours', render: r => (
        <div className="text-[10px] leading-tight text-gray-500">
          <p>{r.opening_time?.slice(0, 5)} – {r.closing_time?.slice(0, 5)}</p>
        </div>
      )
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant={statusVariant(r.status)} size="sm">{r.status?.toUpperCase()}</Badge>
    },
    {
      key: 'actions', label: '', render: r => (
        <div className="flex justify-end gap-2">
          <Button
            variant={r.is_active ? 'danger' : 'success'}
            size="sm"
            onClick={() => dispatch(toggleMartStatus({ martId: r.id, is_active: !r.is_active }))}
          >
            {r.is_active ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(r)}>
            Configure
          </Button>
        </div>
      )
    },
  ].filter(col => !isSuperAdmin || col.key !== 'actions')

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Marts"
        subtitle="Manage dark store infrastructure"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRefreshData}>
              🔄 Refresh
            </Button>
            {!isSuperAdmin && (
              <Button variant="primary" onClick={() => {
                const randomRazorpayId = 'acc_' + Math.random().toString(36).substring(2, 16).toUpperCase();
                setForm({ ...EMPTY, razorpay_id: randomRazorpayId });
                setEditingMart(null);
                setModalOpen(true);
              }}>
                + Add New Mart
              </Button>
            )}
          </div>
        }
      />

      <Grid columns={columns} data={marts} loading={loading} searchKey="name" />

      <Modal
        title={editingMart ? `Configure: ${editingMart.name}` : 'Create New Mart'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editingMart ? 'Update Mart' : 'Create Mart'}
            </Button>
          </>
        }
      >
        <div className="space-y-8">

          {/* ── Section 1: Identity ── */}
          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-[8px]">1</span>
              Identity & Contact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Mart Code" placeholder="e.g. VZG-01" value={form.pg_mart_id} onChange={e => set('pg_mart_id', e.target.value)} />
              <Input label="Mart Name *" placeholder="e.g. Gajuwaka Mart" value={form.name} onChange={e => set('name', e.target.value)} />
              <Input label="Phone *" placeholder="Contact number" value={form.phone} onChange={e => set('phone', e.target.value)} />
              <Input label="Email" placeholder="mart@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </section>

          {/* ── Section 2: Location ── */}
          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-primary-100 rounded-full flex items-center justify-center text-[8px]">2</span>
              Location & Logistics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input label="Full Address" placeholder="Street, Landmark" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <Input label="Pincode" placeholder="530026" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
              <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} />
              <Input label="Latitude *" type="number" placeholder="17.xxx" value={form.lat} onChange={e => set('lat', e.target.value)} />
              <Input label="Longitude *" type="number" placeholder="83.xxx" value={form.lng} onChange={e => set('lng', e.target.value)} />
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Service Radius (meters)" type="number" value={form.serviceRadius} onChange={e => set('serviceRadius', e.target.value)} />
              <Input label="Coverage Pincodes" placeholder="530001, 530002, 530026" value={form.coveragePincodes} onChange={e => set('coveragePincodes', e.target.value)} />
              <Select 
                label="Associated Warehouse *" 
                value={form.warehouse_id} 
                onChange={e => set('warehouse_id', e.target.value)}
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map(w => (
                  <option key={w.warehouse_id} value={w.warehouse_id}>
                    {w.name} ({w.city})
                  </option>
                ))}
              </Select>
            </div>
          </section>

          {/* ── Section 3: Branding ── */}
          <section className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[8px]">3</span>
              Branding & Media
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageInput label="Mart Logo" value={form.logo} onChange={v => set('logo', v)} />
              <ImageInput label="Hero Banner" value={form.banner} onChange={v => set('banner', v)} />
            </div>
            <div className="mt-8 border-t border-gray-100 pt-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carousel Banners</label>
                <Button variant="secondary" size="sm" onClick={addBanner}>+ Add Slide</Button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {form.banners?.map((b, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm relative group">
                    <div className="w-full md:w-48">
                      <ImageInput placeholder="Banner URL" value={b.image_url} onChange={v => updateBanner(idx, 'image_url', v)} />
                    </div>
                    <div className="w-full md:w-32">
                      <Select label="Action" value={b.action_type} onChange={e => updateBanner(idx, 'action_type', e.target.value)}>
                        <option value="category">Category</option>
                        <option value="product">Product</option>
                        <option value="external">External</option>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input label="Action Value" placeholder="Slug or URL" value={b.action_value} onChange={e => updateBanner(idx, 'action_value', e.target.value)} />
                    </div>
                    <button
                      onClick={() => removeBanner(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Section 4: Financials ── */}
          <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center text-[8px]">4</span>
              Financials & Hours
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Min Order Value (₹)" type="number" value={form.minOrderValue} onChange={e => set('minOrderValue', e.target.value)} />
              <Input label="Delivery Fee (₹)" type="number" value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} />
              <Input label="Free Delivery Above (₹)" type="number" value={form.freeDeliveryAbove} onChange={e => set('freeDeliveryAbove', e.target.value)} />
              <Input label="Opening Time" type="time" value={form.openingTime} onChange={e => set('openingTime', e.target.value)} />
              <Input label="Closing Time" type="time" value={form.closingTime} onChange={e => set('closingTime', e.target.value)} />
              <Input label="GST Percentage (%)" type="number" value={form.gstPercentage} onChange={e => set('gstPercentage', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Input label="GSTIN" placeholder="GST Registration Number" value={form.gstin} onChange={e => set('gstin', e.target.value)} />
              <Input label="Operational Notice" placeholder="e.g. Closed for maintenance" value={form.operational_notice} onChange={e => set('operational_notice', e.target.value)} />
              <Input label="Razorpay ID (Franchise)" placeholder="acc_XXXXXXXXXXXXXX" value={form.razorpay_id} onChange={e => set('razorpay_id', e.target.value)} />
            </div>
          </section>

        </div>
      </Modal>
    </div>
  )
}