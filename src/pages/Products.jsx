// src/pages/Products.jsx
import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchProducts, createProduct, setBulkStatus,
  selectAllProducts, selectProductLoading, selectBulkStatus
} from '../store/slices/productSlice'
import { fetchMarts, selectAllMarts } from '../store/slices/martSlice'
import { fetchCategories, selectAllCategories } from '../store/slices/categorySlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Table from '../components/Table'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import MartSelector from '../components/MartSelector'
import Input, { Select } from '../components/Input'
import { MultiImageInput } from '../components/Imageinput'
import useMart from '../hooks/useMart'

const INITIAL = {
  name: '', brand: '', categoryId: '', subcategorySlug: '',
  price: '', mrp: '', stockQty: '0', lowStockAlert: '10',
  displayUnit: '', unit: '', baseWeightGrams: '', inventoryUnit: '',
  description: '', tags: '',
  barcode: '', pluCode: '',
  sub_category_slug: '',
  category_slug: '',
  isLoose: false, pricePer: '', isActive: true,
  images: [],
  details: [], // array of { key, value } pairs
}

// ── Dynamic Details Editor ────────────────────────────────────
// Admin enters key-value pairs for product details
// e.g. { key: 'warranty', value: '1 year' }
function DetailsEditor({ details, onChange }) {
  const addRow = () => onChange([...details, { key: '', value: '' }])
  const removeRow = (i) => onChange(details.filter((_, idx) => idx !== i))
  const updateRow = (i, field, val) => {
    const updated = [...details]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }

  return (
    <div className="form-group">
      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0">Product Details (key → value)</label>
        <Button variant="secondary" size="sm" onClick={addRow}>+ Add Field</Button>
      </div>
      {details.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No details added. Click + Add Field to add product specifications.</p>
      ) : (
        <div className="space-y-2">
          {details.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="input flex-1"
                placeholder="Field name (e.g. warranty)"
                value={row.key}
                onChange={e => updateRow(i, 'key', e.target.value)}
              />
              <input
                className="input flex-1"
                placeholder="Value (e.g. 1 year)"
                value={row.value}
                onChange={e => updateRow(i, 'value', e.target.value)}
              />
              <button
                onClick={() => removeRow(i)}
                className="text-red-400 hover:text-red-600 px-2 font-bold text-lg"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-1">
        These become searchable product attributes. E.g: warranty → 1 year, color → black, weight → 500g
      </p>
    </div>
  )
}

export default function Products() {
  const dispatch = useDispatch()
  const products = useSelector(selectAllProducts)
  const loading = useSelector(selectProductLoading)
  const bulkStatus = useSelector(selectBulkStatus)
  const categories = useSelector(selectAllCategories)
  const marts = useSelector(selectAllMarts) // needed for super admin selector

  const { activeMartId, selectorProps } = useMart()

  const [catId, setCatId] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [form, setForm] = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [csvRows, setCsvRows] = useState([])
  const [csvHdrs, setCsvHdrs] = useState([])
  const [mapping, setMapping] = useState({})
  const fileRef = useRef()

  useEffect(() => {
    dispatch(fetchMarts())
    dispatch(fetchCategories())
  }, [dispatch])

  // Also reload categories when mart changes
  useEffect(() => {
    if (activeMartId) dispatch(fetchCategories())
  }, [activeMartId, dispatch])

  useEffect(() => {
    if (activeMartId && catId) dispatch(fetchProducts({ martId: activeMartId, categoryId: catId }))
  }, [activeMartId, catId, dispatch])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const selectedCat = categories.find(c => (c._id || c.id) === form.categoryId)
  const subcategories = selectedCat?.subcategories || []

  // Convert details array to object for API
  const detailsToObj = (details) => {
    const obj = {}
    details.forEach(({ key, value }) => { if (key) obj[key] = value })
    return obj
  }

  const handleCreate = async () => {
    if (!form.name || !form.price || !form.categoryId || !activeMartId) {
      dispatch(showToast({ message: 'Name, price, category and mart required', type: 'error' }))
      return
    }
    setSaving(true)
    const cat = categories.find(c => (c._id || c.id) === form.categoryId)
    const res = await dispatch(createProduct({
      ...form,
      price: parseFloat(form.price),
      mrp: parseFloat(form.mrp || form.price),
      stockQty: parseInt(form.stockQty) || 0,
      lowStockAlert: parseInt(form.lowStockAlert) || 10,
      categoryName: cat?.name || '',
      martId: activeMartId,
      pluCode: form.pluCode || null,
      barcode: form.barcode || null,
      displayUnit: form.displayUnit || '',
      unit: form.unit || '',
      baseWeightGrams: parseInt(form.baseWeightGrams) || 0,
      inventoryUnit: form.inventoryUnit || '',
      sub_category_slug: form.sub_category_slug || null,
      category_slug: form.category_slug || null,
      description: form.description || '',
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      isActive: form.isActive,
      pricePer: form.pricePer || null,
      images: form.images,
      details: detailsToObj(form.details),
    }))
    setSaving(false)
    if (!res.error) {
      dispatch(showToast({ message: 'Product created!', type: 'success' }))
      setAddOpen(false); setForm(INITIAL)
      if (catId === form.categoryId) dispatch(fetchProducts({ martId: activeMartId, categoryId: catId }))
    } else {
      dispatch(showToast({ message: res.payload || 'Failed', type: 'error' }))
    }
  }

  const parseCSV = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const hdrs = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const rows = lines.slice(1)
        .filter(line => !line.startsWith('#') && line.trim()) // skip comment and empty lines
        .map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
          const row = {}
          hdrs.forEach((h, i) => row[h] = vals[i] || '')
          return row
        }).filter(r => Object.values(r).some(v => v))
      setCsvHdrs(hdrs); setCsvRows(rows)
      autoMap(hdrs)
    }
  }

  const autoMap = (hdrs) => {
    const find = (...kws) => hdrs.find(h => kws.some(k => h.toLowerCase().includes(k))) || ''
    setMapping({
      name: find('name', 'product'),
      brand: find('brand'),
      price: find('price', 'selling'),
      mrp: find('mrp', 'maximum'),
      stock: find('stock', 'qty', 'quantity'),
      displayUnit: find('display_unit', 'display unit'),
      unit: find('unit', 'uom'),
      baseWeight: find('base_weight', 'grams'),
      inventoryUnit: find('inv_unit', 'inventory'),
      barcode: find('barcode', 'ean'),
      plu_code: find('plu'),
      sub_category_slug: find('sub_category_slug', 'sub_category_slug'),
      category_slug: find('category_slug', 'category_slug'),
      category: find('category', 'cat'),
      alert: find('alert', 'low'),
      isActive: find('is_active', 'active'),
      description: find('desc'),
      tags: find('tags'),
      image_url_1: find('image_url_1', 'image1', 'img1'),
      image_url_2: find('image_url_2', 'image2', 'img2'),
      image_url_3: find('image_url_3', 'image3', 'img3'),
      image_url_4: find('image_url_4', 'image4', 'img4'),
      image_url_5: find('image_url_5', 'image5', 'img5'),
    })
  }

  const handleBulkUpload = async () => {
    if (!activeMartId) return dispatch(showToast({ message: 'No mart available', type: 'error' }))
    if (!csvRows.length) return

    const KNOWN_COLS = [
      ...Object.values(mapping).filter(Boolean),
      'image_url_1', 'image_url_2', 'image_url_3', 'image_url_4', 'image_url_5',
    ]
    let done = 0, success = 0, failed = 0
    dispatch(setBulkStatus({ total: csvRows.length, done: 0, success: 0, failed: 0 }))

    for (const row of csvRows) {
      const name = row[mapping.name]?.toString().trim()
      if (!name) { done++; continue }
      try {
        const catName = row[mapping.category] || ''
        const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())

        // All columns AFTER 'details' column, OR unmapped columns, go into details
        const details = {}
        const detailsIdx = csvHdrs.findIndex(h => h.toLowerCase() === 'details')
        if (detailsIdx !== -1) {
          csvHdrs.forEach((h, i) => {
            if (i > detailsIdx && row[h]) details[h] = row[h]
          })
        } else {
          csvHdrs.forEach(h => {
            if (!KNOWN_COLS.includes(h) && row[h]) details[h] = row[h]
          })
        }

        const res = await dispatch(createProduct({
          name,
          brand: row[mapping.brand] || null,
          price: parseFloat(row[mapping.price]) || 0,
          mrp: parseFloat(row[mapping.mrp] || row[mapping.price]) || 0,
          stockQty: parseInt(row[mapping.stock]) || 0,
          lowStockAlert: parseInt(row[mapping.alert]) || 10,
          displayUnit: row[mapping.displayUnit] || '',
          unit: row[mapping.unit] || '',
          baseWeightGrams: parseInt(row[mapping.baseWeight]) || 0,
          inventoryUnit: row[mapping.inventoryUnit] || '',
          description: row[mapping.description] || '',
          tags: row[mapping.tags] ? row[mapping.tags].split(',').map(t => t.trim()).filter(Boolean) : [],
          isActive: row[mapping.isActive] ? row[mapping.isActive].toLowerCase() === 'true' : true,
          barcode: row[mapping.barcode] || null,
          pluCode: row[mapping.plu_code] || null,
          sub_category_slug: row[mapping.sub_category_slug] || null,
          category_slug: row[mapping.category_slug] || null,
          categoryId: cat?._id || cat?.id || null,
          categoryName: cat?.name || catName || 'General',
          isLoose: !!(row[mapping.plu_code]),
          martId: activeMartId,
          details,
        }))
        if (!res.error) success++; else failed++
      } catch { failed++ }

      done++
      dispatch(setBulkStatus({ total: csvRows.length, done, success, failed }))
    }

    dispatch(showToast({ message: `${success} products uploaded!`, type: 'success' }))
    setBulkOpen(false); setCsvRows([]); setCsvHdrs([])
    dispatch(setBulkStatus(null))
    if (catId) dispatch(fetchProducts({ martId: activeMartId, categoryId: catId }))
  }

  const columns = [
    {
      key: 'name', label: 'Product', render: r => (
        <div className="flex items-center gap-2">
          {r.images?.[0] ? (
            <img src={r.images[0]} className="w-8 h-8 rounded object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
          )}
          <div>
            <p className="font-medium text-gray-900">{r.name}</p>
            <p className="text-xs text-gray-400">{r.brand} · {r.displayUnit}</p>
          </div>
        </div>
      )
    },
    {
      key: 'price', label: 'Price', render: r => (
        <div>
          <p className="font-semibold">₹{r.price}</p>
          {r.mrp > r.price && <p className="text-xs text-gray-400 line-through">₹{r.mrp}</p>}
        </div>
      )
    },
    { key: 'stockQty', label: 'Stock', render: r => r.stockQty ?? r.stock_qty ?? 0 },
    { key: 'inStock', label: 'Status', render: r => <Badge>{(r.inStock ?? r.in_stock) ? 'active' : 'inactive'}</Badge> },
    { key: 'barcode', label: 'Barcode/PLU', render: r => <span className="text-xs font-mono">{r.barcode || r.pluCode || '—'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage mart product catalog"
        action={
          <div className="flex items-center gap-2">
            <MartSelector {...selectorProps} />
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>📤 Bulk Upload</Button>
            <Button variant="primary" onClick={() => { setForm(INITIAL); setAddOpen(true) }}>+ Add Product</Button>
          </div>
        }
      />

      {/* Category filter */}
      {activeMartId && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map(c => (
            <button
              key={c._id || c.id}
              onClick={() => setCatId(c._id || c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${catId === (c._id || c.id) ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        {!activeMartId ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">🛍️</div>
            <p className="text-gray-400 text-sm">{selectorProps.show ? 'Select a mart to view products' : 'No mart assigned'}</p>
          </div>
        ) : !catId ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-2">🗂️</div>
            <p className="text-gray-400 text-sm">Select a category above</p>
          </div>
        ) : (
          <Table columns={columns} data={products} loading={loading} emptyText="No products in this category" />
        )}
      </div>

      {/* Add Product Modal */}
      <Modal title="Add Product" open={addOpen} onClose={() => setAddOpen(false)} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleCreate}>Add Product</Button>
          </>
        }
      >
        {/* Product Images */}
        <MultiImageInput
          label="Product Images (up to 5)"
          values={form.images}
          onChange={urls => set('images', urls)}
          max={5}
        />

        <div className="form-grid-2">
          <Input label="Product Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tata Salt 1kg" />
          <Input label="Brand" value={form.brand} onChange={e => set('brand', e.target.value)} />
          <Select label="Category" required value={form.categoryId} onChange={e => { set('categoryId', e.target.value); set('subcategorySlug', '') }}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <Select label="Subcategory" value={form.subcategorySlug} onChange={e => set('subcategorySlug', e.target.value)}>
            <option value="">No subcategory</option>
            {subcategories.map(s => <option key={s._id || s.id} value={s.slug}>{s.name}</option>)}
          </Select>
          <Input label="Price (₹)" required type="number" value={form.price} onChange={e => set('price', e.target.value)} />
          <Input label="MRP (₹)" type="number" value={form.mrp} onChange={e => set('mrp', e.target.value)} />
          <Input label="Initial Stock" type="number" value={form.stockQty} onChange={e => set('stockQty', e.target.value)} />
          <Input label="Low Stock Alert" type="number" value={form.lowStockAlert} onChange={e => set('lowStockAlert', e.target.value)} />
          <Input label="Display Unit" value={form.displayUnit} onChange={e => set('displayUnit', e.target.value)} placeholder="1 kg" />
          <Input label="Unit" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="kg | g | ml | l | pcs" />
          <Input label="Base Weight (g/ml)" type="number" value={form.baseWeightGrams} onChange={e => set('baseWeightGrams', e.target.value)} placeholder="1000" />
          <Input label="Inventory Unit" value={form.inventoryUnit} onChange={e => set('inventoryUnit', e.target.value)} placeholder="kg" />
          <Input label="Barcode" value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="8901030012345" />
          <Input label="PLU Code" value={form.pluCode} onChange={e => set('pluCode', e.target.value)} placeholder="001" />
          <Input label="sub_ category_slug" value={form.sub_category_slug} onChange={e => set('sub_category_slug', e.target.value)} placeholder="001" />
          <Input label="category_slug" value={form.category_slug} onChange={e => set('category_slug', e.target.value)} placeholder="001" />
          <Input label="Tags (comma separated)" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="organic, bestseller" />
        </div>

        <div className="mb-3 mt-2">
          <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Premium quality product description" />
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
            <label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">Active</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isLoose" checked={form.isLoose} onChange={e => set('isLoose', e.target.checked)} />
            <label htmlFor="isLoose" className="text-sm text-gray-700 cursor-pointer">Loose product (sold by weight)</label>
          </div>
        </div>

        {form.isLoose && (
          <div className="form-grid-2 mb-3">
            <Input label="PLU Code" value={form.pluCode} onChange={e => set('pluCode', e.target.value)} placeholder="001" />
            <Select label="Price Per" value={form.pricePer} onChange={e => set('pricePer', e.target.value)}>
              <option value="">Select</option>
              {['kg', 'litre', 'gm', 'ml', 'piece'].map(u => <option key={u} value={u}>{u}</option>)}
            </Select>
          </div>
        )}

        {/* Dynamic details */}
        <div className="border-t border-gray-100 pt-4 mt-2">
          <DetailsEditor
            details={form.details}
            onChange={details => set('details', details)}
          />
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal title="Bulk Upload Products" open={bulkOpen} onClose={() => { setBulkOpen(false); setCsvRows([]) }} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setBulkOpen(false); setCsvRows([]) }}>Cancel</Button>
            {csvRows.length > 0 && (
              <Button variant="primary" loading={!!bulkStatus} onClick={handleBulkUpload}>
                Upload {csvRows.length} Products
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-3">
            <p className="text-xs font-medium text-accent-700 mb-0.5">ℹ️ How details work in CSV</p>
            <p className="text-xs text-accent-600">
              Standard columns (name, price, stock...) map to product fields.
              Any extra columns after these automatically become product details.
              Example: adding a "warranty" column → sets details.warranty
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => {
            const csv = [
              '# KSMCM Product Bulk Upload Template',
              '# STANDARD COLUMNS (map these to product fields):',
              '# name        = Product name (required)',
              '# brand       = Brand name',
              '# price       = Selling price in rupees (required)',
              '# mrp         = Maximum retail price',
              '# stock       = Initial stock quantity',
              '# display_unit= Display unit shown to customer (e.g. 1kg 500ml 1piece)',
              '# unit        = kg | g | ml | l | pcs',
              '# base_weight = weight in grams (e.g. 1000 for 1kg)',
              '# inv_unit    = inventory unit (how stock is counted, e.g. kg)',
              '# barcode     = Barcode number for branded products',
              '# plu_code    = PLU code for loose/weight products (e.g. 001)',
              '# category_slug    = Category slug (must match existing category)',
              '# sub_category_slug= Sub-category slug (must match existing sub_category)',
              '# low_stock_alert = Alert when stock goes below this number',
              '# is_active   = true/false',
              '# image_url_1 = First product image URL (already uploaded to GCS)',
              '# desc        = Product description',
              '# tags        = Comma separated tags',
              '# details     = Add a column named exactly "details". ANY COLUMNS AFTER THIS will go inside the details object.',
              '',
              'name,brand,price,mrp,stock,display_unit,unit,base_weight,inv_unit,barcode,plu_code,category,low_stock_alert,is_active,desc,tags,image_url_1,details,warranty,color,weight',
              'Tata Salt 1kg,Tata,22,24,100,1 kg,kg,1000,kg,8901030012345,,Grocery,10,true,Premium salt,"salt,grocery",https://storage.googleapis.com/ksmcm-media/products/salt.jpg,,,,',
              'Rice Loose,,60,60,2000,kg,kg,1000,kg,,001,Grocery,100,true,Loose organic rice,"rice",https://storage.googleapis.com/ksmcm-media/products/rice.jpg,,,,',
              'boAt Earphones,boAt,999,1299,20,1 piece,pcs,100,pcs,,,Electronics,3,true,Wireless earphones,"tech",https://storage.googleapis.com/ksmcm-media/products/boat1.jpg,details,1 year,Black,45g',
            ].join('\n')
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
            a.download = 'products_template.csv'; a.click()
          }}>⬇ Download Template</Button>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
            onClick={() => fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); parseCSV(e.dataTransfer.files[0]) }}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => parseCSV(e.target.files[0])} />
            <div className="text-3xl mb-2">📂</div>
            <p className="text-sm font-medium text-gray-600">Drag & drop CSV file</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          </div>

          {csvHdrs.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">{csvRows.length} rows — Map standard columns:</p>
                <span className="text-xs text-gray-400">Unmapped columns → product details automatically</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Object.keys(mapping).filter(k => !k.startsWith('image_url')).map(field => (
                  <div key={field}>
                    <label className="label capitalize">{field.replace(/_/g, ' ')}</label>
                    <select className="input" value={mapping[field]} onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}>
                      <option value="">— skip —</option>
                      {csvHdrs.filter(h => !h.startsWith('#')).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Image URL columns — auto mapped */}
              <div className="bg-primary-50 rounded-lg p-3 mt-2">
                <p className="text-xs font-medium text-primary-700 mb-2">Image URL columns (auto detected):</p>
                <div className="grid grid-cols-5 gap-2">
                  {['image_url_1', 'image_url_2', 'image_url_3', 'image_url_4', 'image_url_5'].map(field => (
                    <div key={field}>
                      <label className="label text-xs">{field.replace('image_url_', 'Image ')}</label>
                      <select className="input text-xs" value={mapping[field]} onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}>
                        <option value="">— skip —</option>
                        {csvHdrs.filter(h => !h.startsWith('#')).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              {/* Show which columns will become details */}
              {csvHdrs.filter(h => !Object.values(mapping).includes(h)).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">These columns → product details:</p>
                  <div className="flex gap-2 flex-wrap">
                    {csvHdrs.filter(h => !Object.values(mapping).includes(h) && h).map(h => (
                      <span key={h} className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {bulkStatus && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>✅ {bulkStatus.success} uploaded · ❌ {bulkStatus.failed} failed</span>
                <span>{bulkStatus.done} / {bulkStatus.total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${(bulkStatus.done / bulkStatus.total) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}