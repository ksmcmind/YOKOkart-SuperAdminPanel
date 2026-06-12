import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select, Textarea } from '../components/Input'
import { showToast } from '../store/slices/uiSlice'
import {
  fetchStaffRoles,
  createStaffRole,
  toggleStaffRoleStatus,
  selectAllStaffRoles,
  selectStaffLoading
} from '../store/slices/staffSlice'

export default function Roles() {
  const dispatch = useDispatch()
  const roles = useSelector(selectAllStaffRoles)
  const loading = useSelector(selectStaffLoading)

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    role: '',
    role_type: 'mart',
    description: ''
  })

  useEffect(() => {
    dispatch(fetchStaffRoles())
  }, [dispatch])

  const handleToggleStatus = async (role) => {
    if (!window.confirm(`Are you sure you want to change the status of role "${role}"?`)) return
    try {
      const res = await dispatch(toggleStaffRoleStatus(role)).unwrap()
      dispatch(showToast({ message: 'Role status updated successfully!', type: 'success' }))
      dispatch(fetchStaffRoles())
    } catch (err) {
      dispatch(showToast({ message: err || 'Failed to toggle status', type: 'error' }))
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!form.role || !form.role_type) {
      dispatch(showToast({ message: 'Role Code and Role Type are required', type: 'error' }))
      return
    }

    setSubmitting(true)
    try {
      await dispatch(createStaffRole(form)).unwrap()
      dispatch(showToast({ message: 'Role created successfully!', type: 'success' }))
      setOpen(false)
      setForm({ role: '', role_type: 'mart', description: '' })
      dispatch(fetchStaffRoles())
    } catch (err) {
      dispatch(showToast({ message: err || 'Failed to create role', type: 'error' }))
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'role',
      label: 'Role Code / Name',
      render: (row) => <span className="font-mono font-bold text-indigo-600">{row.role}</span>
    },
    {
      key: 'role_type',
      label: 'Role Type',
      render: (row) => {
        let variant = 'gray'
        if (row.role_type === 'platform') variant = 'purple'
        if (row.role_type === 'mart') variant = 'green'
        if (row.role_type === 'warehouse') variant = 'blue'
        return <Badge variant={variant}>{row.role_type.toUpperCase()}</Badge>
      }
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => <span className="text-slate-600 text-xs font-semibold">{row.description || '—'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'green' : 'red'}>
          {row.is_active ? 'ACTIVE' : 'DISABLED'}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant={row.is_active ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => handleToggleStatus(row.role)}
          >
            {row.is_active ? '⛔ Disable' : '✅ Enable'}
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Staff Role Management"
        subtitle="View, create, and enable/disable staff authorization roles across platforms, marts, and warehouses."
        action={
          <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={() => setOpen(true)}>
            + Create New Role
          </Button>
        }
      />

      <Grid
        columns={columns}
        data={roles}
        loading={loading}
        emptyText="No roles found."
        pagination={false}
        showSearch={true}
        searchPlaceholder="Search roles..."
        searchKey={(item, query) => [item.role, item.role_type, item.description].some(v => String(v || '').toLowerCase().includes(query))}
      />

      <Modal
        title="Create New Staff Role"
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-700" loading={submitting} onClick={handleSubmit}>Create Role</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Role Code / Name *"
            required
            placeholder="e.g. warehouse_auditor"
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
            helperText="Lowercase letters and underscores only (e.g. mart_cashier)"
          />

          <Select
            label="Role Type *"
            required
            value={form.role_type}
            onChange={e => setForm(prev => ({ ...prev, role_type: e.target.value }))}
          >
            <option value="platform">Platform (Global / Read-only)</option>
            <option value="mart">Mart (Local store operations)</option>
            <option value="warehouse">Warehouse (Supply facility logistics)</option>
          </Select>

          <Textarea
            label="Description / Purpose"
            placeholder="Describe the access levels and responsibilities of this staff role..."
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  )
}
