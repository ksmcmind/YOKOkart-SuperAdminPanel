// src/components/PageHeader.jsx
export default function PageHeader({ title, subtitle, action, children }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {(children || action) && <div>{children || action}</div>}
    </div>
  )
}