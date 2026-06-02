import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import BulkUploadModal from '../components/BulkUploadModal'
import Grid from '../components/Grid'
import { showToast } from '../store/slices/uiSlice'
import api from '../api/index'

const SCHEMA_FIELDS = [
  'brand_code',
  'name',
  'slug',
  'logo_url',
  'banner_url',
  'description',
  'display_order',
  'is_active',
  'is_featured'
]

const FIELD_VALIDATORS = {
  brand_code: v => v?.trim() ? true : 'Brand Code is required',
  name: v => v?.trim() ? true : 'Name is required'
}

export default function BrandBulkUpload() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [brands, setBrands] = useState([])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [brandPage, setBrandPage] = useState(1)
  const [brandPagination, setBrandPagination] = useState({ total: 0, total_pages: 1, has_next: false, has_prev: false })
  const BRAND_PAGE_SIZE = 20

  const fetchBrands = async (page = brandPage) => {
    setLoadingBrands(true)
    try {
      const res = await api.get(`/products/brands?all=true&page=${page}&limit=${BRAND_PAGE_SIZE}`)
      if (res.success) {
        setBrands(res.data?.brands || [])
        if (res.data?.pagination) setBrandPagination(res.data.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch brands list:', err)
    } finally {
      setLoadingBrands(false)
    }
  }

  useEffect(() => {
    fetchBrands(brandPage)
  }, [brandPage])

  const downloadCSVTemplate = () => {
    const headers = SCHEMA_FIELDS.join(',')
    const sampleRow = 'BRAND-AMUL,Amul,amul,https://example.com/logo.png,https://example.com/banner.png,The Taste of India,1,true,true'
    const blob = new Blob([`${headers}\n${sampleRow}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'brands_upload_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    dispatch(showToast({ message: 'CSV template downloaded!', type: 'success' }))
  }

  const handleUpload = async (rows, file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/products/brands/bulk', formData)
      
      if (res.success) {
        dispatch(showToast({ message: 'Brands processed successfully!', type: 'success' }))
        setLastResult(res)
        setBrandPage(1)
        fetchBrands(1)
        return {
          created: res.created || 0,
          updated: res.updated || 0,
          errors: []
        }
      } else {
        dispatch(showToast({ message: res.message || 'Upload failed', type: 'error' }))
        return {
          created: 0,
          updated: 0,
          errors: res.errors || [res.message]
        }
      }
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Upload failed', type: 'error' }))
      return {
        created: 0,
        updated: 0,
        errors: [err.message]
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[80%] mx-auto w-full">
      <PageHeader
        title="Brand Bulk Upload"
        subtitle="Manage global catalog brands by uploading CSV spreadsheets"
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={downloadCSVTemplate}>
              ⬇ Download Template
            </Button>
            <Button variant="primary" onClick={() => setOpen(true)}>
              🏷️ Upload Brands CSV
            </Button>
          </div>
        }
      />

      {/* Guide cards — only show when no brands exist yet */}
      {brandPagination.total === 0 && !loadingBrands && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full translate-x-12 -translate-y-12 opacity-30 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 text-xl font-bold mb-4 shadow-sm">
            📄
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Format Rules</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Ensure your spreadsheet contains unique <code className="bg-gray-50 px-1 py-0.5 rounded text-primary-600 font-mono">brand_code</code> and <code className="bg-gray-50 px-1 py-0.5 rounded text-primary-600 font-mono">name</code> fields. Slashes or special characters in slugs are auto-cleaned.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full translate-x-12 -translate-y-12 opacity-30 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 text-xl font-bold mb-4 shadow-sm">
            ⚡
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Upsert Handling</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Uploading rows with an existing <code className="bg-gray-50 px-1 py-0.5 rounded text-orange-600 font-mono">brand_code</code> will automatically perform an update (upsert) to keep your catalog clean.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full translate-x-12 -translate-y-12 opacity-30 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 text-xl font-bold mb-4 shadow-sm">
            🔗
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Product Linking</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Once a brand is registered, products can immediately bind to it by specifying the matching <code className="bg-gray-50 px-1 py-0.5 rounded text-green-600 font-mono">brand_code</code> in their uploads.
          </p>
        </div>
      </div>
      )}

      {/* Interactive Status & Success Logs */}
      {lastResult && (
        <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/20 border border-green-100 rounded-3xl p-6 shadow-sm animate-in zoom-in-95 duration-200">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
            Last Execution Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-green-50 shadow-inner">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Processed</span>
              <span className="text-2xl font-black text-gray-700 mt-1 block">{lastResult.total || 0}</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-green-50 shadow-inner">
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest block">Brands Created</span>
              <span className="text-2xl font-black text-green-600 mt-1 block">+{lastResult.created || 0}</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-green-50 shadow-inner">
              <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest block">Brands Updated</span>
              <span className="text-2xl font-black text-primary-600 mt-1 block">+{lastResult.updated || 0}</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-green-50 shadow-inner">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Status</span>
              <span className="text-xs font-black text-green-700 mt-2.5 uppercase tracking-wider block bg-green-100/60 py-0.5 px-2.5 rounded-full w-max">SUCCESS</span>
            </div>
          </div>
        </div>
      )}

      {/* Schema guide — only show when no brands exist yet */}
      {brandPagination.total === 0 && !loadingBrands && (
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-600 rounded-full"></span>
          Brand Schema Configuration Guide
        </h3>
        <div className="overflow-x-auto border border-gray-50 rounded-xl">
          <table className="table text-xs w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="py-2.5 px-4 font-bold text-gray-500 text-left">Column Name</th>
                <th className="py-2.5 px-4 font-bold text-gray-500 text-left">Required</th>
                <th className="py-2.5 px-4 font-bold text-gray-500 text-left">Description</th>
                <th className="py-2.5 px-4 font-bold text-gray-500 text-left">Sample Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-3 px-4 font-mono font-bold text-primary-600">brand_code</td>
                <td className="py-3 px-4 text-red-500 font-bold">YES</td>
                <td className="py-3 px-4 text-gray-500">Unique uppercase code to reference in product tables</td>
                <td className="py-3 px-4 font-mono text-gray-400">BRAND-AMUL</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-bold text-primary-600">name</td>
                <td className="py-3 px-4 text-red-500 font-bold">YES</td>
                <td className="py-3 px-4 text-gray-500">Display name of the brand</td>
                <td className="py-3 px-4 text-gray-400">Amul</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-gray-600">slug</td>
                <td className="py-3 px-4 text-gray-400">NO</td>
                <td className="py-3 px-4 text-gray-500">Slug for URL route (falls back to slugified name)</td>
                <td className="py-3 px-4 font-mono text-gray-400">amul</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-gray-600">logo_url</td>
                <td className="py-3 px-4 text-gray-400">NO</td>
                <td className="py-3 px-4 text-gray-500">Absolute path to brand image logo asset</td>
                <td className="py-3 px-4 text-gray-400 truncate max-w-xs">https://example.com/logo.png</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-gray-600">description</td>
                <td className="py-3 px-4 text-gray-400">NO</td>
                <td className="py-3 px-4 text-gray-500">Short text introduction/description of brand</td>
                <td className="py-3 px-4 text-gray-400">Fresh dairy since 1946</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Registered Brands Table */}
      <div className="bg-gradient-to-br from-white to-primary-50/15 rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary-600 rounded-full"></span>
              Registered Brands ({brandPagination.total})
            </h3>
            <p className="text-xs text-gray-400 mt-1">Currently registered and active brand configurations in the database</p>
          </div>
          <button 
            onClick={fetchBrands} 
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95 border border-gray-100 flex items-center justify-center w-8 h-8"
            title="Refresh Brands"
          >
            🔄
          </button>
        </div>

        <Grid
          columns={[
            {
              key: 'brand',
              label: 'Brand',
              render: b => (
                <div className="py-1 font-bold flex items-center gap-3">
                  {b.logo_url ? (
                    <img 
                      src={b.logo_url} 
                      alt={b.name} 
                      className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-100 p-0.5"
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div 
                    className={`w-8 h-8 rounded-lg bg-primary-50 text-primary-700 font-black text-xs items-center justify-center border border-primary-100/50 ${b.logo_url ? 'hidden' : 'flex'}`}
                  >
                    {(b.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-800 font-semibold">{b.name}</span>
                </div>
              )
            },
            {
              key: 'brand_code',
              label: 'Brand Code',
              render: b => <span className="font-mono font-bold text-primary-600">{b.brand_code}</span>
            },
            {
              key: 'slug',
              label: 'Slug',
              render: b => <span className="font-mono text-gray-500">{b.slug}</span>
            },
            {
              key: 'description',
              label: 'Description',
              render: b => <span className="text-gray-500 max-w-xs truncate block" title={b.description}>{b.description || '—'}</span>
            },
            {
              key: 'status',
              label: 'Status',
              render: b => (
                <div className="space-x-1.5 whitespace-nowrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {b.is_featured && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      ⭐ Featured
                    </span>
                  )}
                </div>
              )
            }
          ]}
          data={brands}
          loading={loadingBrands}
          showSearch={false}
          emptyText="No registered brands found."
          pagination={false}
        />

        {/* Server-side Pagination */}
        {brandPagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400 font-semibold">
              Showing {((brandPage - 1) * BRAND_PAGE_SIZE) + 1}–{Math.min(brandPage * BRAND_PAGE_SIZE, brandPagination.total)} of {brandPagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBrandPage(p => Math.max(1, p - 1))}
                disabled={!brandPagination.has_prev}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  brandPagination.has_prev
                    ? 'border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95'
                    : 'border-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                ← Prev
              </button>
              <span className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                {brandPage} / {brandPagination.total_pages}
              </span>
              <button
                onClick={() => setBrandPage(p => p + 1)}
                disabled={!brandPagination.has_next}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  brandPagination.has_next
                    ? 'border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95'
                    : 'border-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <BulkUploadModal
        open={open}
        onClose={() => setOpen(false)}
        onDone={fetchBrands}
        title="Bulk Upload Brands"
        schemaFields={SCHEMA_FIELDS}
        fieldValidators={FIELD_VALIDATORS}
        onUpload={handleUpload}
        downloadCSVTemplate={downloadCSVTemplate}
      />
    </div>
  )
}
