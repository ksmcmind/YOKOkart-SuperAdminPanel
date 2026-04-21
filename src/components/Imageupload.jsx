// src/components/ImageUpload.jsx
// Reusable image upload component
// Converts to base64 → sends to /api/upload/image → returns GCS URL

import { useState, useRef } from 'react'
import api from '../api/index'

export default function ImageUpload({
  label     = 'Upload Image',
  folder    = 'general',
  value     = null,       // current image URL
  onChange,               // callback(url)
  accept    = 'image/*',
  maxSizeMB = 2,
}) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setError('')

    // Size check
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB}MB allowed`)
      return
    }

    setLoading(true)
    try {
      // Convert to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload to GCS via our API
      const res = await api.post('/upload/image', { image: base64, folder })
      if (res.success) {
        onChange(res.data.url)
      } else {
        setError(res.message || 'Upload failed')
      }
    } catch (err) {
      setError('Upload failed. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="form-group">
      {label && <label className="label">{label}</label>}

      <div className="flex items-center gap-3">
        {/* Preview */}
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="uploaded"
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
            <button
              onClick={() => onChange(null)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
            >×</button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current.click()}
            className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
            ) : (
              <span className="text-gray-400 text-xl">+</span>
            )}
          </div>
        )}

        <div>
          <button
            onClick={() => fileRef.current.click()}
            disabled={loading}
            className="btn btn-secondary btn-sm"
          >
            {loading ? 'Uploading...' : value ? 'Change' : 'Upload'}
          </button>
          <p className="text-xs text-gray-400 mt-1">Max {maxSizeMB}MB</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Multi image upload ────────────────────────────────────────
export function MultiImageUpload({ label = 'Product Images', folder = 'products', values = [], onChange, max = 5 }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const fileRef = useRef()

  const handleFiles = async (files) => {
    if (!files.length) return
    if (values.length + files.length > max) {
      setError(`Maximum ${max} images allowed`)
      return
    }
    setLoading(true); setError('')
    try {
      const base64s = await Promise.all(
        Array.from(files).map(file => new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload  = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        }))
      )
      const res = await api.post('/upload/images', { images: base64s, folder })
      if (res.success) onChange([...values, ...res.data.urls])
      else setError(res.message || 'Upload failed')
    } catch { setError('Upload failed') }
    setLoading(false)
  }

  const removeImage = (idx) => onChange(values.filter((_, i) => i !== idx))

  return (
    <div className="form-group">
      {label && <label className="label">{label} ({values.length}/{max})</label>}
      <div className="flex gap-2 flex-wrap">
        {values.map((url, idx) => (
          <div key={idx} className="relative">
            <img src={url} alt={`img${idx}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
            <button
              onClick={() => removeImage(idx)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
            >×</button>
          </div>
        ))}
        {values.length < max && (
          <div
            onClick={() => fileRef.current.click()}
            className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-400 transition-colors"
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
            ) : <span className="text-gray-400 text-xl">+</span>}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}