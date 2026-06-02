import { useState } from 'react'
import { useDispatch } from 'react-redux'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import BulkUploadModal from '../components/BulkUploadModal'
import { showToast } from '../store/slices/uiSlice'
import api from '../api/index'

const SCHEMA_FIELDS = [
  'product_code',
  'variant_code',
  'variant_name',
  'display_size',
  'sku',
  'barcode',
  'plu_code',
  'details',
  'images',
  'is_active'
]

const FIELD_VALIDATORS = {
  product_code: v => v?.trim() ? true : 'Parent product_code is required',
  variant_code: v => v?.trim() ? true : 'Variant code is required',
  sku: v => v?.trim() ? true : 'SKU is required'
}

export default function VariantBulkUpload() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const downloadCSVTemplate = () => {
    const headers = SCHEMA_FIELDS.join(',')
    const sampleRow = 'PROD-AMUL-MILK,VAR-AMUL-500ML,500ml Pack,500ml,SKU-MILK-AMUL-500,8901262010112,PLU-1002,"{""fat"":""3.5%"",""shelf_life"":""2 Days""}",https://example.com/milk1.png,true'
    const blob = new Blob([`${headers}\n${sampleRow}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'variants_upload_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    dispatch(showToast({ message: 'CSV template downloaded!', type: 'success' }))
  }

  const handleUpload = async (rows, file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/products/bulk/upload?type=variants', formData)
      
      if (res.success) {
        dispatch(showToast({ message: 'Variants queue job registered successfully!', type: 'success' }))
        setLastResult({ jobId: res.jobId, total: res.totalRows })
        return {
          jobId: res.jobId,
          total: res.totalRows,
          errors: []
        }
      } else {
        dispatch(showToast({ message: res.message || 'Queuing failed', type: 'error' }))
        return {
          created: 0,
          updated: 0,
          errors: res.errors || [res.message]
        }
      }
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Queuing failed', type: 'error' }))
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
        title="Variant Bulk Upload"
        subtitle="Manage nested product variants asynchronously in the background"
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={downloadCSVTemplate}>
              ⬇ Download Template
            </Button>
            <Button variant="primary" onClick={() => setOpen(true)}>
              🧬 Upload Variants CSV
            </Button>
          </div>
        }
      />

      {/* Modern Dashboard Aesthetic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full translate-x-12 -translate-y-12 opacity-30 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 text-xl font-bold mb-4 shadow-sm">
            🔗
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Parent Mapping</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Every variant must map to a parent catalog product by setting a matching <code className="bg-gray-50 px-1 py-0.5 rounded text-primary-600 font-mono">product_code</code>. Invalid codes are automatically skipped and logged.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full translate-x-12 -translate-y-12 opacity-30 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 text-xl font-bold mb-4 shadow-sm">
            📦
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Default Stock Setup</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            New variants automatically receive default zero-stock inventories across all active marts and warehouses instantly upon ingestion.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full translate-x-12 -translate-y-12 opacity-30 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 text-xl font-bold mb-4 shadow-sm">
            ⚙️
          </div>
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Asynchronous Queue</h4>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Large Excel/CSV files are queued onto our background BullMQ workers. You can track progress updates right from the header notifications badge!
          </p>
        </div>
      </div>

      {/* Interactive Status & Success Logs */}
      {lastResult && (
        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/20 border border-indigo-100 rounded-3xl p-6 shadow-sm animate-in zoom-in-95 duration-200">
          <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">⏳</span>
            Background Process Queued
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-50 shadow-inner">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Job Identifier</span>
              <span className="text-xs font-mono font-bold text-indigo-600 mt-2 block break-all">{lastResult.jobId}</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-50 shadow-inner">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Rows Sent</span>
              <span className="text-2xl font-black text-gray-700 mt-1 block">{lastResult.total || 0}</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-indigo-50 shadow-inner">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Processing Mode</span>
              <span className="text-xs font-black text-indigo-700 mt-2.5 uppercase tracking-wider block bg-indigo-100/60 py-0.5 px-2.5 rounded-full w-max">BACKGROUND QUEUE</span>
            </div>
          </div>
        </div>
      )}

      {/* Setup Guide */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-primary-600 rounded-full"></span>
          Variant Schema Configuration Guide
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
                <td className="py-3 px-4 font-mono font-bold text-indigo-600">product_code</td>
                <td className="py-3 px-4 text-red-500 font-bold">YES</td>
                <td className="py-3 px-4 text-gray-500">Parent product code matching the database (e.g. product_id)</td>
                <td className="py-3 px-4 font-mono text-gray-400">PROD-AMUL-MILK</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-bold text-indigo-600">variant_code</td>
                <td className="py-3 px-4 text-red-500 font-bold">YES</td>
                <td className="py-3 px-4 text-gray-500">Unique variant identifier (uppercase dashes)</td>
                <td className="py-3 px-4 font-mono text-gray-400">VAR-AMUL-500ML</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-bold text-indigo-600">sku</td>
                <td className="py-3 px-4 text-red-500 font-bold">YES</td>
                <td className="py-3 px-4 text-gray-500">Unique Stock Keeping Unit barcode reference</td>
                <td className="py-3 px-4 font-mono text-gray-400">SKU-MILK-AMUL-500</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-gray-600">variant_name</td>
                <td className="py-3 px-4 text-gray-400 font-bold">NO</td>
                <td className="py-3 px-4 text-gray-500">Variant name title (defaults to code if empty)</td>
                <td className="py-3 px-4 text-gray-400">500ml Pack</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-gray-600">display_size</td>
                <td className="py-3 px-4 text-gray-400">NO</td>
                <td className="py-3 px-4 text-gray-500">Friendly label size text</td>
                <td className="py-3 px-4 text-gray-400">500ml</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-gray-600">details</td>
                <td className="py-3 px-4 text-gray-400">NO</td>
                <td className="py-3 px-4 text-gray-500">Custom specification properties block formatted in JSON</td>
                <td className="py-3 px-4 font-mono text-gray-400 truncate max-w-xs">{"{"}"fat":"3.5%"{"}"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <BulkUploadModal
        open={open}
        onClose={() => setOpen(false)}
        title="Bulk Upload Variants"
        schemaFields={SCHEMA_FIELDS}
        fieldValidators={FIELD_VALIDATORS}
        onUpload={handleUpload}
        downloadCSVTemplate={downloadCSVTemplate}
      />
    </div>
  )
}
