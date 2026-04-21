// src/components/Modal.jsx
import { useEffect } from 'react'
import Button from './Button'

export default function Modal({ title, open, onClose, children, size = 'md', footer }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Modal */}
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}