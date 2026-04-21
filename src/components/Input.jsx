// src/components/Input.jsx
export default function Input({
  label,
  error,
  type      = 'text',
  className = '',
  required  = false,
  ...props
}) {
  return (
    <div className="form-group">
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, required, className = '', ...props }) {
  return (
    <div className="form-group">
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, required, className = '', ...props }) {
  return (
    <div className="form-group">
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={`input resize-none ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}