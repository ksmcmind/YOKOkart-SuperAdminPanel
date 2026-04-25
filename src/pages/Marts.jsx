// src/pages/Marts.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchMarts, createMart, toggleMartStatus, updateMart,
  selectAllMarts, selectMartsLoading
} from '../store/slices/martSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageInput from '../components/Imageinput'

const EMPTY = {
  pg_mart_id: '', name: '', phone: '', email: '', address: '', pincode: '', city: 'Visakhapatnam',
  lat: '', lng: '', serviceRadius: '5000', minOrderValue: '99',
  deliveryFee: '20', freeDeliveryAbove: '299', openingTime: '08:00',
  closingTime: '22:00', coveragePincodes: '', gstin: '', gstPercentage: '0',
  logo: '', banner: '', banners: [], operational_notice: ''
}

const statusVariant = (status) => ({
  open: 'success', closed: 'default', busy: 'warning', maintenance: 'danger',
}[status] || 'default')

export default function Marts() {
  const dispatch = useDispatch()
  const marts = useSelector(selectAllMarts)
  const loading = useSelector(selectMartsLoading)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editingMart, setEditingMart] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleOpenEdit = (mart) => {
    setEditingMart(mart)
    setForm({
      ...EMPTY,
      pg_mart_id: mart.pg_mart_id || '',
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
      coveragePincodes: Array.isArray(mart.coverage_pincodes) ? mart.coverage_pincodes.join(', ') : '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.pg_mart_id || !form.lat || !form.lng) {
      dispatch(showToast({ message: 'Mart ID, Name, Phone, and Coordinates are required', type: 'error' })); return
    }
    setSaving(true)
    const payload = {
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      service_radius: parseInt(form.serviceRadius) || 5000,
      min_order_value: parseFloat(form.minOrderValue) || 99,
      delivery_fee: parseFloat(form.deliveryFee) || 20,
      free_delivery_above: parseFloat(form.free_delivery_above) || 299,
      gst_percentage: parseFloat(form.gstPercentage) || 0,
      coverage_pincodes: form.coveragePincodes ? form.coveragePincodes.split(',').map(s => s.trim()).filter(Boolean) : [],
    }
    const action = editingMart ? updateMart({ id: editingMart.id, data: payload }) : createMart(payload)
    const res = await dispatch(action)
    setSaving(false)
    if (!res.error) setModalOpen(false)
  }

  const addBanner = () => set('banners', [...(form.banners || []), { image_url: '', action_type: 'category', action_value: '', is_active: true }])
  const removeBanner = (idx) => set('banners', form.banners.filter((_, i) => i !== idx))
  const updateBanner = (idx, field, val) => {
    const next = [...form.banners]; next[idx] = { ...next[idx], [field]: val }; set('banners', next)
  }

  const columns = [
    {
      key: 'name', label: 'Mart', render: r => (
        <div className="flex items-center gap-3 py-1">
          <img src={r.logo || '/placeholder.png'} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt="" />
          <div>
            <p className="font-bold text-gray-900 leading-tight">{r.name}</p>
            <p className="text-[10px] text-gray-500">{r.address}</p>
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
      key: 'location', label: 'Location', render: r => (
        <div className="text-[10px] leading-tight text-gray-500 font-medium uppercase tracking-tighter">
          <p>{r.city}</p>
          <p>{r.pincode}</p>
        </div>
      )
    },
    { key: 'status', label: 'Status', render: r => <Badge variant={statusVariant(r.status)} size="sm">{r.status}</Badge> },
    {
      key: 'actions', label: '', render: r => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(r)}>Edit</Button>
          <Button variant={r.status === 'open' ? 'warning' : 'primary'} size="sm" onClick={() => dispatch(toggleMartStatus(r.id))}>
            {r.status === 'open' ? 'Close' : 'Open'}
          </Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader title="Marts" subtitle="Manage dark store infrastructure"
        action={<Button variant="primary" onClick={() => { setForm(EMPTY); setEditingMart(null); setModalOpen(true) }}>+ Add New Mart</Button>}
      />
      
      <Grid columns={columns} data={marts} loading={loading} searchKey="name" />

      <Modal title={editingMart ? `Configure: ${editingMart.name}` : "Create New Mart"} open={modalOpen} onClose={() => setModalOpen(false)} size="lg"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleSave}>Save Mart Configuration</Button></>}>
        <div className="space-y-8">
          <section>
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Identity & Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Mart ID *" placeholder="e.g. MART-01" value={form.pg_mart_id} onChange={e => set('pg_mart_id', e.target.value)} />
              <Input label="Mart Name *" placeholder="e.g. Gajuwaka Mart" value={form.name} onChange={e => set('name', e.target.value)} />
              <Input label="Phone *" placeholder="Contact number" value={form.phone} onChange={e => set('phone', e.target.value)} />
              <Input label="Email Address" placeholder="mart@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Location & Logistics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input label="Full Address *" placeholder="Street, Landmark" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <Input label="Pincode *" placeholder="6 digits" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
              <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} />
              <Input label="Latitude *" type="number" placeholder="17.xxx" value={form.lat} onChange={e => set('lat', e.target.value)} />
              <Input label="Longitude *" type="number" placeholder="83.xxx" value={form.lng} onChange={e => set('lng', e.target.value)} />
            </div>
            <div className="mt-4">
              <Input label="Service Radius (meters)" type="number" value={form.serviceRadius} onChange={e => set('serviceRadius', e.target.value)} />
              <Input label="Coverage Pincodes" placeholder="Comma separated: 530001, 530002" value={form.coveragePincodes} onChange={e => set('coveragePincodes', e.target.value)} />
            </div>
          </section>

          <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Branding & Media</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageInput label="Mart Logo" value={form.logo} onChange={v => set('logo', v)} />
              <ImageInput label="Hero Banner" value={form.banner} onChange={v => set('banner', v)} />
            </div>
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-bold text-gray-700">Carousel Banners</label>
                <Button variant="secondary" size="sm" onClick={addBanner}>+ Add Slide</Button>
              </div>
              <div className="space-y-4">
                {form.banners?.map((b, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex-1"><ImageInput placeholder="Banner URL" value={b.image_url} onChange={v => updateBanner(idx, 'image_url', v)} /></div>
                    <div className="w-full md:w-32"><Select label="Action" value={b.action_type} onChange={e => updateBanner(idx, 'action_type', e.target.value)}><option value="category">Category</option><option value="product">Product</option><option value="external">External</option></Select></div>
                    <div className="flex-1"><Input label="Value" placeholder="Slug or URL" value={b.action_value} onChange={e => updateBanner(idx, 'action_value', e.target.value)} /></div>
                    <button onClick={() => removeBanner(idx)} className="self-center text-red-500 hover:text-red-700 font-bold px-2 text-xl">×</button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-4">Financials & Hours</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Min Order Value (₹)" type="number" value={form.minOrderValue} onChange={e => set('minOrderValue', e.target.value)} />
              <Input label="Delivery Fee (₹)" type="number" value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} />
              <Input label="Free Delivery Above (₹)" type="number" value={form.freeDeliveryAbove} onChange={e => set('freeDeliveryAbove', e.target.value)} />
              <Input label="Opening Time" type="time" value={form.openingTime} onChange={e => set('openingTime', e.target.value)} />
              <Input label="Closing Time" type="time" value={form.closingTime} onChange={e => set('closingTime', e.target.value)} />
              <Input label="GST Percentage (%)" type="number" value={form.gstPercentage} onChange={e => set('gstPercentage', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input label="GSTIN" placeholder="GST Registration Number" value={form.gstin} onChange={e => set('gstin', e.target.value)} />
              <Input label="Operational Notice" placeholder="e.g. Closed for maintenance" value={form.operational_notice} onChange={e => set('operational_notice', e.target.value)} />
            </div>
          </section>
        </div>
      </Modal>
    </div>
  )
}