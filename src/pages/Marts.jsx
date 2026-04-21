import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchMarts, createMart, toggleMartStatus, updateMart,
  selectAllMarts, selectMartsLoading
} from '../store/slices/martSlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Table from '../components/Table'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import ImageInput from '../components/Imageinput'

// 1. ADDED pg_mart_id TO EMPTY STATE
const EMPTY = {
  pg_mart_id: '',
  name: '', phone: '', email: '', address: '', pincode: '', city: 'Visakhapatnam',
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

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editMart, setEditMart] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchMarts()) }, [dispatch])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addBannerRow = () => {
    set('banners', [...(form.banners || []), {
      image_url: '', action_type: 'category', action_value: '', is_active: true
    }])
  }

  const updateBanner = (idx, field, val) => {
    const updated = [...form.banners]
    updated[idx] = { ...updated[idx], [field]: val }
    set('banners', updated)
  }

  const removeBanner = (idx) => {
    set('banners', form.banners.filter((_, i) => i !== idx))
  }

  const openEdit = (mart) => {
    setEditMart(mart);
    setForm({
      ...EMPTY,
      // 2. EXPLICITLY MAP pg_mart_id FROM DATA
      pg_mart_id: mart.pg_mart_id || mart.name || '',
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
    });
    setEditOpen(true);
  };

  const buildPayload = () => {
    return {
      // 3. ENSURE ID IS IN PAYLOAD
      pg_mart_id: form.pg_mart_id,
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      city: form.city,
      pincode: form.pincode,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),

      service_radius: parseInt(form.serviceRadius) || 5000,
      min_order_value: parseFloat(form.minOrderValue) || 99,
      delivery_fee: parseFloat(form.deliveryFee) || 20,
      free_delivery_above: parseFloat(form.free_delivery_above) || 299,
      opening_time: form.openingTime,
      closing_time: form.closingTime,
      coverage_pincodes: form.coveragePincodes ? form.coveragePincodes.split(',').map(s => s.trim()).filter(Boolean) : [],

      gst_percentage: parseFloat(form.gstPercentage) || 0,
      gstin: form.gstin,
      logo: form.logo,
      banner: form.banner,
      banners: form.banners,
      operational_notice: form.operational_notice
    };
  };

  const handleCreate = async () => {
    // 4. ADDED pg_mart_id TO VALIDATION CHECK
    if (!form.name || !form.phone || !form.lat || !form.lng || !form.pg_mart_id) {
      dispatch(showToast({ message: 'Required fields (including Mart ID) missing', type: 'error' }))
      return
    }
    setSaving(true)
    const res = await dispatch(createMart(buildPayload()))
    setSaving(false)
    if (!res.error) {
      dispatch(showToast({ message: 'Mart created!', type: 'success' }))
      setAddOpen(false); setForm(EMPTY)
    }
  }

  const handleEdit = async () => {
    setSaving(true)
    const res = await dispatch(updateMart({ id: editMart.id, data: buildPayload() }))
    setSaving(false)
    if (!res.error) {
      dispatch(showToast({ message: 'Mart updated!', type: 'success' }))
      setEditOpen(false); setEditMart(null)
    }
  }

  const renderFormFields = (
    <div className="space-y-8 py-4">
      <section>
        <h4 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 5. ADDED INPUT FOR pg_mart_id */}
          <Input label="Mart ID" required value={form.pg_mart_id} onChange={e => set('pg_mart_id', e.target.value)} />
          <Input label="Mart Name" required value={form.name} onChange={e => set('name', e.target.value)} />
          <Input label="Phone" required value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} />
          <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} />
          <Input label="Pincode" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
          <Input label="Latitude" required type="number" value={form.lat} onChange={e => set('lat', e.target.value)} />
          <Input label="Longitude" required type="number" value={form.lng} onChange={e => set('lng', e.target.value)} />
        </div>
      </section>

      <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Media & Branding</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageInput label="Store Logo" value={form.logo} onChange={v => set('logo', v)} />
          <ImageInput label="Hero Banner" value={form.banner} onChange={v => set('banner', v)} />
        </div>
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <label className="label mb-0">Carousel Banners</label>
            <Button variant="secondary" size="sm" onClick={addBannerRow}>+ Add Slide</Button>
          </div>
          <div className="space-y-3">
            {form.banners?.map((b, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <ImageInput placeholder="Banner URL" value={b.image_url} onChange={v => updateBanner(idx, 'image_url', v)} />
                </div>
                <div className="w-full md:w-32">
                  <Select label="Type" value={b.action_type} onChange={e => updateBanner(idx, 'action_type', e.target.value)}>
                    <option value="category">Category</option>
                    <option value="product">Product</option>
                    <option value="external">External</option>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input label="Value" value={b.action_value} onChange={e => updateBanner(idx, 'action_value', e.target.value)} />
                </div>
                <button onClick={() => removeBanner(idx)} className="self-center text-red-400 hover:text-red-600 font-bold px-2">×</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-4">Operations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Radius (m)" type="number" value={form.serviceRadius} onChange={e => set('serviceRadius', e.target.value)} />
          <Input label="Min Order (₹)" type="number" value={form.minOrderValue} onChange={e => set('minOrderValue', e.target.value)} />
          <Input label="Delivery Fee (₹)" type="number" value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} />
          <Input label="Opening" type="time" value={form.openingTime} onChange={e => set('openingTime', e.target.value)} />
          <Input label="Closing" type="time" value={form.closingTime} onChange={e => set('closingTime', e.target.value)} />
          <Input label="GST %" type="number" value={form.gstPercentage} onChange={e => set('gstPercentage', e.target.value)} />
        </div>
        <div className="mt-4">
          <Input label="Coverage Pincodes" value={form.coveragePincodes} onChange={e => set('coveragePincodes', e.target.value)} />
          <Input label="Operational Notice" value={form.operational_notice} onChange={e => set('operational_notice', e.target.value)} />
        </div>
      </section>
    </div>
  );

  return (
    <div>
      <PageHeader title="Marts" subtitle="Manage dark stores"
        action={<Button variant="primary" onClick={() => { setForm(EMPTY); setAddOpen(true) }}>+ Add Mart</Button>}
      />
      <div className="card">
        <Table columns={[
          { key: 'name', label: 'Mart', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-gray-400">{r.address}</p></div> },
          { key: 'pincode', label: 'Pincode' },
          { key: 'status', label: 'Status', render: r => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
          {
            key: 'actions', label: 'Actions', render: r => (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                <Button variant={r.status === 'open' ? 'warning' : 'primary'} size="sm" onClick={() => dispatch(toggleMartStatus(r.id))}>
                  {r.status === 'open' ? 'Close' : 'Open'}
                </Button>
              </div>
            )
          }
        ]} data={marts} loading={loading} />
      </div>

      <Modal title="Add Mart" open={addOpen} onClose={() => setAddOpen(false)} size="lg"
        footer={<><Button onClick={() => setAddOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleCreate}>Create</Button></>}>
        {renderFormFields}
      </Modal>

      <Modal title={`Edit ${editMart?.name}`} open={editOpen} onClose={() => setEditOpen(false)} size="lg"
        footer={<><Button onClick={() => setEditOpen(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleEdit}>Save</Button></>}>
        {renderFormFields}
      </Modal>
    </div>
  )
}