import { useState, useRef } from 'react'
import { useDispatch } from 'react-redux'
import * as XLSX from 'xlsx'
import Modal from './Modal'
import Button from './Button'
import { showToast } from '../store/slices/uiSlice'

/**
 * Reusable Bulk Upload Modal
 * 
 * Props:
 * - open: boolean
 * - onClose: function
 * - onDone: function (called after successful upload)
 * - title: string
 * - schemaFields: string[] (order of columns in CSV/XLSX)
 * - fieldValidators: object (key: fieldName, value: function(val) => true | string)
 * - onUpload: function(payload) => Promise (should return results: { created, updated, errors })
 * - downloadCSVTemplate: function
 * - downloadXLSXTemplate: function
 * - groupRows: function(rows) => payload (optional, defaults to returning rows)
 * - previewComponent: React.Component (optional, custom preview UI)
 * - instructions: React.ReactNode (optional)
 */
export default function BulkUploadModal({
  open,
  onClose,
  onDone,
  title = "Bulk Upload",
  schemaFields = [],
  fieldValidators = {},
  onUpload,
  downloadCSVTemplate,
  downloadXLSXTemplate,
  groupRows = (rows) => rows,
  previewComponent: PreviewComponent,
  instructions,
}) {
  const dispatch = useDispatch()
  const [step, setStep] = useState('upload') // upload, header-error, row-error, preview, done
  const [loading, setLoading] = useState(false)
  const [rawRows, setRawRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [headerErrors, setHeaderErrors] = useState({ missing: [], unknown: [] })
  const [rowErrors, setRowErrors] = useState([])
  const [payload, setPayload] = useState([])
  const [result, setResult] = useState(null)
  const [file, setFile] = useState(null)
  const fileRef = useRef()

  const reset = () => {
    setStep('upload')
    setRawRows([])
    setHeaders([])
    setHeaderErrors({ missing: [], unknown: [] })
    setRowErrors([])
    setPayload([])
    setResult(null)
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const normalizeHeader = h => {
    if (!h) return ''
    return h.toString()
      .trim()
      .toLowerCase()
      .replace(/^\uFEFF/, '')        // Remove BOM
      .replace(/[^a-z0-9]/g, '_')    // Replace all non-alphanumeric with _
      .replace(/_+/g, '_')           // Collapse multiple _
      .replace(/^_+|_+$/g, '')       // Trim leading/trailing _
  }

  const splitCSVLine = (line) => {
    const out = []; let cur = ''; let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (c === ',' && !inQuote) { out.push(cur); cur = '' }
      else cur += c
    }
    out.push(cur)
    return out.map(s => s.trim().replace(/^"|"$/g, ''))
  }

  const parseCSV = (text) => {
    // Remove BOM and split lines
    const cleanText = text.replace(/^\uFEFF/, '')
    const lines = cleanText.split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#'))
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')
    const [headerLine, ...rows] = lines
    const headers = splitCSVLine(headerLine).map(normalizeHeader)
    return {
      headers,
      rows: rows.map(row => {
        const vals = splitCSVLine(row)
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] ?? '' }), {})
      }),
    }
  }

  const parseXLSX = (buffer) => {
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (raw.length < 2) throw new Error('XLSX must have a header row and at least one data row')
    const headers = raw[0].map(h => normalizeHeader(h))
    const rows = raw.slice(1)
      .filter(r => r.some(c => String(c).trim()))
      .map(r => headers.reduce((obj, h, i) => ({ ...obj, [h]: String(r[i] ?? '') }), {}))
    return { headers, rows }
  }

  const validateRows = (headers, rows) => {
    const missing = schemaFields.filter(c => !headers.includes(c))
    const unknown = headers.filter(h => !schemaFields.includes(h))
    const headerOk = missing.length === 0

    const rowErrors = []
    if (headerOk) {
      rows.forEach((row, idx) => {
        schemaFields.forEach(col => {
          const raw = (row[col] ?? '').toString()
          if (fieldValidators[col]) {
            const result = fieldValidators[col](raw)
            if (result !== true) {
              rowErrors.push({ row: idx + 2, column: col, value: raw, reason: result })
            }
          }
        })
      })
    }

    return { ok: headerOk && rowErrors.length === 0, headerErrors: { missing, unknown }, rowErrors }
  }

  const processData = ({ headers: h, rows: r }) => {
    console.log('Normalized Headers Found:', h)
    setHeaders(h); setRawRows(r)
    const { ok, headerErrors: hErr, rowErrors: rErr } = validateRows(h, r)
    setHeaderErrors(hErr); setRowErrors(rErr)
    
    if (hErr.missing.length) { 
      console.warn('Missing Headers:', hErr.missing)
      setStep('header-error'); 
      setLoading(false); 
      return 
    }

    // Always move to preview if headers are OK (skipping frontend row validation block)
    setPayload(groupRows(r))
    setStep('preview')
    setLoading(false)
  }

  const handleFile = (f) => {
    try {
      if (!f) return
      setFile(f)
      const name = f.name.toLowerCase()
      const isCSV = name.endsWith('.csv')
      const isXLSX = name.endsWith('.xlsx') || name.endsWith('.xls')
      
      if (!isCSV && !isXLSX) {
        dispatch(showToast({ message: 'Only .csv or .xlsx files accepted', type: 'error' }))
        return
      }

      setLoading(true)
      const reader = new FileReader()

      if (isCSV) {
        reader.onload = e => {
          try {
            const data = parseCSV(e.target.result)
            processData(data)
          } catch (err) {
            console.error('CSV Parse Error:', err)
            dispatch(showToast({ message: `CSV Error: ${err.message}`, type: 'error' }))
            setLoading(false)
          }
        }
        reader.onerror = () => {
          dispatch(showToast({ message: 'Failed to read CSV file', type: 'error' }))
          setLoading(false)
        }
        reader.readAsText(f)
      } else {
        reader.onload = e => {
          try {
            const data = parseXLSX(new Uint8Array(e.target.result))
            processData(data)
          } catch (err) {
            console.error('XLSX Parse Error:', err)
            dispatch(showToast({ message: `XLSX Error: ${err.message}`, type: 'error' }))
            setLoading(false)
          }
        }
        reader.onerror = () => {
          dispatch(showToast({ message: 'Failed to read XLSX file', type: 'error' }))
          setLoading(false)
        }
        reader.readAsArrayBuffer(f)
      }
    } catch (err) {
      console.error('handleFile Error:', err)
      dispatch(showToast({ message: 'Error opening file', type: 'error' }))
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    setLoading(true)
    try {
      const res = await onUpload(payload, file)
      setResult(res)
      setStep('done')
      if (onDone) onDone()
    } catch (err) {
      dispatch(showToast({ message: err.message || 'Upload failed', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Modal
      title={title}
      open={open} onClose={handleClose} size="xl"
      footer={
        <div className="flex justify-between items-center w-full min-w-[500px]">
          <div className="flex gap-4">
            {downloadCSVTemplate && (
              <button onClick={downloadCSVTemplate} className="text-[11px] font-bold text-primary-600 hover:underline uppercase tracking-wider">⬇ CSV Template</button>
            )}
            {downloadXLSXTemplate && (
              <button onClick={downloadXLSXTemplate} className="text-[11px] font-bold text-primary-600 hover:underline uppercase tracking-wider">⬇ XLSX Template</button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
            {step === 'preview' && (
              <Button variant="primary" onClick={handleUpload} loading={loading}>
                Upload {payload.length} Item{payload.length !== 1 ? 's' : ''}
              </Button>
            )}
            {(step === 'header-error' || step === 'row-error') && (
              <Button variant="primary" onClick={reset}>Try Again</Button>
            )}
            {step === 'done' && <Button variant="primary" onClick={handleClose}>Done</Button>}
          </div>
        </div>
      }
    >
      {/* STEP: upload */}
      {step === 'upload' && (
        <div className="flex flex-col gap-4 py-6">
          <div
            className={`border-2 border-dashed rounded-2xl py-16 flex flex-col items-center gap-4 transition-all duration-200 ${
              loading ? 'bg-gray-50 border-gray-200 cursor-wait' : 'border-gray-200 bg-white hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
            }`}
            onClick={() => !loading && fileRef.current.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if(!loading) handleFile(e.dataTransfer.files[0]) }}
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2 ${loading ? 'bg-gray-100' : 'bg-primary-50'}`}>
              {loading ? '⏳' : '📂'}
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">
                {loading ? 'Processing file...' : 'Drop CSV or XLSX here'}
              </p>
              <p className="text-sm text-gray-400 mt-1">or click to browse from your computer</p>
            </div>
            {!loading && <Button variant="secondary" size="sm" className="mt-2">Select File</Button>}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />

          {(downloadCSVTemplate || downloadXLSXTemplate) && (
            <div className="flex items-center gap-3 justify-center">
              <span className="text-xs text-gray-500">Need a format template?</span>
              {downloadCSVTemplate && (
                <Button variant="secondary" size="sm" onClick={downloadCSVTemplate}>
                  ⬇ Download CSV Template
                </Button>
              )}
              {downloadXLSXTemplate && (
                <Button variant="secondary" size="sm" onClick={downloadXLSXTemplate}>
                  ⬇ Download XLSX Template
                </Button>
              )}
            </div>
          )}

          {instructions ? (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
              {instructions}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600 mb-1">
                {schemaFields.length} columns required:
              </p>
              <p className="font-mono text-gray-400 break-all">{schemaFields.join(' · ')}</p>
            </div>
          )}
        </div>
      )}

      {/* STEP: header-error */}
      {step === 'header-error' && (
        <div className="py-6 flex flex-col gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-700 mb-3">Column header mismatch</p>
            {headerErrors.missing.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Missing ({headerErrors.missing.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {headerErrors.missing.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-mono font-semibold">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 mb-1">Your file's columns:</p>
            <div className="flex flex-wrap gap-1">
              {headers.map(col => (
                <span key={col} className={`px-2 py-0.5 rounded text-xs font-mono ${
                  schemaFields.includes(col) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>{col}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP: row-error */}
      {step === 'row-error' && (
        <div className="py-4 flex flex-col gap-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-bold text-red-700">
              {rowErrors.length} cell{rowErrors.length > 1 ? 's have' : ' has'} invalid data
            </p>
            <p className="text-xs text-red-600 mt-1">Fix these and re-upload.</p>
          </div>
          <div className="overflow-x-auto max-h-80 border border-red-100 rounded-lg">
            <table className="table text-xs w-full">
              <thead className="bg-red-50 sticky top-0">
                <tr>
                  <th className="text-red-700">Row</th>
                  <th className="text-red-700">Column</th>
                  <th className="text-red-700">Value</th>
                  <th className="text-red-700">Problem</th>
                </tr>
              </thead>
              <tbody>
                {rowErrors.slice(0, 100).map((err, i) => (
                  <tr key={i}>
                    <td className="font-mono text-gray-500">{err.row}</td>
                    <td className="font-mono text-gray-700">{err.column}</td>
                    <td className="font-mono text-red-500 max-w-[200px] truncate">
                      {err.value || <em className="text-gray-400">empty</em>}
                    </td>
                    <td className="text-red-700">{err.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rowErrors.length > 100 && (
              <p className="text-xs text-gray-400 text-center py-2">
                + {rowErrors.length - 100} more errors (first 100 shown)
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP: preview */}
      {step === 'preview' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {rawRows.length} rows parsed → <span className="text-green-700">{payload.length} items to upload</span>
              </p>
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500">✕ Change file</button>
          </div>
          
          {PreviewComponent ? (
            <PreviewComponent payload={payload} rawRows={rawRows} />
          ) : (
            <div className="overflow-x-auto max-h-80 border border-gray-100 rounded-lg">
              <table className="table text-xs w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {schemaFields.slice(0, 8).map(f => <th key={f}>{f}</th>)}
                    {schemaFields.length > 8 && <th>...</th>}
                  </tr>
                </thead>
                <tbody>
                  {payload.slice(0, 10).map((item, i) => (
                    <tr key={i}>
                      {schemaFields.slice(0, 8).map(f => (
                        <td key={f} className="truncate max-w-[150px]">{String(item[f] || '')}</td>
                      ))}
                      {schemaFields.length > 8 && <td>...</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {payload.length > 10 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  Showing first 10 items of {payload.length}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP: done */}
      {step === 'done' && (
        <div className="py-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl">
            {result?.jobId ? '⏳' : '✓'}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-800">
              {result?.jobId ? 'Upload Queued' : 'Upload Complete'}
            </h3>
            {result?.jobId ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm text-gray-500">Your file is being processed in the background.</p>
                <p className="text-xs font-mono text-primary-600">Job ID: {result.jobId}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                {result?.created || 0} items created, {result?.updated || 0} updated.
              </p>
            )}
            {result?.errors?.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-left max-w-md">
                <p className="text-xs font-bold text-red-700 mb-1">Errors ({result?.errors?.length}):</p>
                <div className="max-h-32 overflow-y-auto text-[10px] text-red-600 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i}>
                      • {typeof err === 'string' ? err : `${err.row ? `Row ${err.row}: ` : ''}${err.message || 'Unknown error'}`}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
