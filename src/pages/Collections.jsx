// src/pages/Collections.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    fetchCollections,
    createCollection,
    updateCollection,
    toggleCollection,
    deleteCollection,
    bulkCreateCollections,
    selectAllCollections,
    selectCollectionLoading,
    selectCollectionSaving,
    selectCollectionError,
    clearCollectionError,
} from '../store/slices/Collectionslice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Grid from '../components/Grid'
import Modal from '../components/Modal'
import Badge from '../components/Badge'
import Input, { Select } from '../components/Input'
import useAuth from '../hooks/useAuth'

// ── Constants ────────────────────────────────────────────────

const CATEGORY_TYPES = ['product', 'service', 'mixed']

const SLOT_COLORS = {
    hero: '#f97316',
    mid: '#8b5cf6',
    bottom: '#06b6d4',
    popup: '#ec4899',
}

const EMPTY_FORM = {
    slug: '',
    name: '',
    title: '',
    icon: '',
    image_url: '',
    banner_url: '',
    banner_color: '#FFFFFF',
    banner_title: '',
    banner_subtitle: '',
    category_type: 'product',
    category_slugs: '',          // comma-separated string in form, split on save
    subcategory_cards: [],          // [{ slug, label, image_url, icon }]
    sort_order: 0,
    is_active: true,
}

const EMPTY_FILTERS = { search: '', category_type: '', is_active: '' }

const BULK_SCHEMA = `slug,name,title,icon,image_url,banner_url,banner_color,banner_title,banner_subtitle,category_type,category_slugs,sort_order,is_active
all,All,Everything you need,🏪,,,,,,product,,0,true
groceries,Groceries,Fresh Groceries,🛒,,,,Fresh & Fast,Delivered in minutes,product,"vegetables-fruits,dairy",1,true`

// ── Subcategory Card Editor ───────────────────────────────────

function SubcategoryCardEditor({ cards, onChange }) {
    const update = (i, f, v) => {
        const next = [...cards]
        next[i] = { ...next[i], [f]: v }
        onChange(next)
    }
    const add = () => onChange([...cards, { slug: '', label: '', image_url: '', icon: '' }])
    const remove = (i) => onChange(cards.filter((_, idx) => idx !== i))

    return (
        <div className="space-y-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Subcategory Cards
                    <span className="ml-2 text-gray-300 normal-case font-normal">shown as grid on collection page</span>
                </label>
                <button onClick={add} className="text-[10px] text-primary-600 font-bold hover:underline">+ ADD CARD</button>
            </div>
            <div className="space-y-2">
                {cards.map((c, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 items-center group">
                        <input
                            placeholder="slug (e.g. milk)"
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:border-primary-500 focus:ring-0"
                            value={c.slug}
                            onChange={e => update(i, 'slug', e.target.value)}
                        />
                        <input
                            placeholder="Label (e.g. Milk)"
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:border-primary-500 focus:ring-0"
                            value={c.label}
                            onChange={e => update(i, 'label', e.target.value)}
                        />
                        <input
                            placeholder="Icon emoji"
                            className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:border-primary-500 focus:ring-0"
                            value={c.icon}
                            onChange={e => update(i, 'icon', e.target.value)}
                        />
                        <div className="flex gap-1 items-center">
                            <input
                                placeholder="Image URL"
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:border-primary-500 focus:ring-0"
                                value={c.image_url}
                                onChange={e => update(i, 'image_url', e.target.value)}
                            />
                            <button onClick={() => remove(i)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                        </div>
                    </div>
                ))}
                {cards.length === 0 && (
                    <p className="text-[10px] text-gray-400 italic">No subcategory cards added yet.</p>
                )}
            </div>
        </div>
    )
}

// ── Bulk Upload Modal ─────────────────────────────────────────
// Parses CSV/JSON and sends as array to createCollection — NOT file upload

function BulkCollectionModal({ open, onClose, onDone }) {
    const dispatch = useDispatch()
    const saving = useSelector(selectCollectionSaving)
    const [raw, setRaw] = useState('')
    const [parsed, setParsed] = useState([])
    const [errors, setErrors] = useState([])
    const [step, setStep] = useState('input') // input | preview | done

    const parseCSV = (text) => {
        const lines = text.trim().split('\n').filter(Boolean)
        if (lines.length < 2) return []
        const headers = lines[0].split(',').map(h => h.trim())
        return lines.slice(1).map((line, i) => {
            // Handle quoted fields (e.g. "a,b,c")
            const cols = []
            let cur = '', inQ = false
            for (const ch of line) {
                if (ch === '"') { inQ = !inQ }
                else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
                else cur += ch
            }
            cols.push(cur.trim())

            const obj = {}
            headers.forEach((h, j) => { obj[h] = cols[j] ?? '' })
            return obj
        })
    }

    const handleParse = () => {
        setErrors([])
        let rows = []
        try {
            // Try JSON first
            const json = JSON.parse(raw)
            rows = Array.isArray(json) ? json : [json]
        } catch {
            // Fall back to CSV
            rows = parseCSV(raw)
        }

        const errs = []
        const valid = rows.map((r, i) => {
            if (!r.slug?.trim()) errs.push(`Row ${i + 1}: slug required`)
            if (!r.name?.trim()) errs.push(`Row ${i + 1}: name required`)
            if (!r.title?.trim()) errs.push(`Row ${i + 1}: title required`)

            return {
                slug: r.slug?.trim() || '',
                name: r.name?.trim() || '',
                title: r.title?.trim() || '',
                icon: r.icon?.trim() || null,
                image_url: r.image_url || null,
                banner_url: r.banner_url || null,
                banner_color: r.banner_color || '#FFFFFF',
                banner_title: r.banner_title || null,
                banner_subtitle: r.banner_subtitle || null,
                category_type: r.category_type || 'product',
                category_slugs: r.category_slugs
                    ? r.category_slugs.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                subcategory_cards: [],
                sort_order: parseInt(r.sort_order || 0),
                is_active: String(r.is_active).toLowerCase() !== 'false',
            }
        })

        setErrors(errs)
        setParsed(valid)
        if (!errs.length) setStep('preview')
    }

    const handleUpload = async () => {
        // Sends array — NOT a file
        const res = await dispatch(bulkCreateCollections(parsed))
        if (!res.error) {
            setStep('done')
            onDone()
        }
    }

    const reset = () => { setRaw(''); setParsed([]); setErrors([]); setStep('input') }

    return (
        <Modal
            open={open}
            onClose={() => { onClose(); reset() }}
            title="Bulk Create Collections"
            size="xl"
            footer={
                step === 'input' ? <><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={handleParse}>Parse & Preview</Button></>
                    : step === 'preview' ? <><Button variant="secondary" onClick={() => setStep('input')}>← Back</Button><Button variant="primary" loading={saving} onClick={handleUpload}>Create {parsed.length} Collections</Button></>
                        : <Button variant="primary" onClick={() => { onClose(); reset() }}>Done</Button>
            }
        >
            {step === 'input' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <p className="text-[11px] font-bold text-blue-700 mb-1">Accepts CSV or JSON array</p>
                        <p className="text-[10px] text-blue-500">CSV columns: slug, name, title, icon, image_url, banner_url, banner_color, banner_title, banner_subtitle, category_type, category_slugs (comma-separated inside quotes), sort_order, is_active</p>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paste CSV or JSON</label>
                            <button
                                onClick={() => setRaw(BULK_SCHEMA)}
                                className="text-[10px] text-primary-600 font-bold hover:underline"
                            >
                                Load sample CSV
                            </button>
                        </div>
                        <textarea
                            className="w-full h-52 text-xs font-mono border border-gray-200 rounded-lg p-3 focus:border-primary-500 focus:ring-0 resize-none"
                            placeholder="Paste CSV rows or JSON array here..."
                            value={raw}
                            onChange={e => setRaw(e.target.value)}
                        />
                    </div>
                    {errors.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
                            {errors.map((e, i) => <p key={i} className="text-[11px] text-red-600">{e}</p>)}
                        </div>
                    )}
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-3">
                    <p className="text-[11px] text-gray-500">{parsed.length} collections ready to create. Review before uploading:</p>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                        {parsed.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="text-lg">{c.icon || '📦'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-gray-800 truncate">{c.name} <span className="text-gray-400 font-normal">({c.slug})</span></p>
                                    <p className="text-[10px] text-gray-400">{c.category_type} · {c.category_slugs.length} categories · order {c.sort_order}</p>
                                </div>
                                <Badge variant={c.is_active ? 'green' : 'red'} size="xs">{c.is_active ? 'Active' : 'Inactive'}</Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div className="py-8 text-center space-y-2">
                    <p className="text-4xl">✅</p>
                    <p className="text-sm font-bold text-gray-700">{parsed.length} collections created successfully</p>
                </div>
            )}
        </Modal>
    )
}

// ── Main Page ─────────────────────────────────────────────────

export default function Collections() {
    const dispatch = useDispatch()
    const { user, isSuperAdmin } = useAuth()

    const collections = useSelector(selectAllCollections)
    const loading = useSelector(selectCollectionLoading)
    const saving = useSelector(selectCollectionSaving)
    const error = useSelector(selectCollectionError)

    const [addOpen, setAddOpen] = useState(false)
    const [bulkOpen, setBulkOpen] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [isEdit, setIsEdit] = useState(false)
    const [filterType, setFilterType] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [search, setSearch] = useState('')

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    useEffect(() => { dispatch(fetchCollections()) }, [dispatch])

    useEffect(() => {
        if (error) {
            dispatch(showToast({ message: error, type: 'error' }))
            dispatch(clearCollectionError())
        }
    }, [error, dispatch])

    const filtered = collections.filter(c => {
        if (filterType && c.categoryType !== filterType) return false
        if (filterStatus === 'true' && !c.isActive) return false
        if (filterStatus === 'false' && c.isActive) return false
        if (search && !c.name.toLowerCase().includes(search.toLowerCase())
            && !c.slug.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const handleEdit = (col) => {
        setForm({
            slug: col.slug,
            name: col.name,
            title: col.title,
            icon: col.icon || '',
            image_url: col.imageUrl || '',
            banner_url: col.bannerUrl || '',
            banner_color: col.bannerColor || '#FFFFFF',
            banner_title: col.bannerTitle || '',
            banner_subtitle: col.bannerSubtitle || '',
            category_type: col.categoryType || 'product',
            category_slugs: (col.categorySlugs || []).join(', '),
            subcategory_cards: col.subcategoryCards || [],
            sort_order: col.sortOrder ?? 0,
            is_active: col.isActive ?? true,
            _id: col.id,
        })
        setIsEdit(true)
        setAddOpen(true)
    }

    const handleSave = async () => {
        if (!form.slug?.trim()) { dispatch(showToast({ message: 'Slug is required', type: 'error' })); return }
        if (!form.name?.trim()) { dispatch(showToast({ message: 'Name is required', type: 'error' })); return }
        if (!form.title?.trim()) { dispatch(showToast({ message: 'Title is required', type: 'error' })); return }

        const payload = {
            ...form,
            category_slugs: typeof form.category_slugs === 'string'
                ? form.category_slugs.split(',').map(s => s.trim()).filter(Boolean)
                : form.category_slugs,
        }

        let res
        if (isEdit) {
            res = await dispatch(updateCollection({ slug: form.slug, data: payload }))
        } else {
            res = await dispatch(createCollection(payload))
        }

        if (!res.error) {
            setAddOpen(false); setForm(EMPTY_FORM); setIsEdit(false)
            dispatch(showToast({ message: isEdit ? 'Collection updated' : 'Collection created', type: 'success' }))
        }
    }

    const handleToggle = async (col) => {
        await dispatch(toggleCollection({ slug: col.slug, isActive: !col.isActive }))
        dispatch(showToast({ message: `${col.name} ${!col.isActive ? 'activated' : 'deactivated'}`, type: 'success' }))
    }

    const columns = [
        {
            key: 'name', label: 'Collection', render: r => (
                <div className="flex items-center gap-3 py-1">
                    <span className="text-2xl">{r.icon || '📦'}</span>
                    <div>
                        <p className="font-bold text-gray-900 leading-tight">{r.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{r.slug}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'title', label: 'Page Title', render: r => (
                <div>
                    <p className="text-[12px] font-bold text-gray-700">{r.title}</p>
                    {r.bannerTitle && <p className="text-[10px] text-gray-400">{r.bannerTitle}</p>}
                </div>
            ),
        },
        {
            key: 'type', label: 'Type', render: r => (
                <Badge
                    variant={r.categoryType === 'service' ? 'purple' : r.categoryType === 'mixed' ? 'yellow' : 'blue'}
                    size="sm"
                >
                    {r.categoryType}
                </Badge>
            ),
        },
        {
            key: 'categories', label: 'Categories', render: r => (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {(r.categorySlugs || []).length === 0
                        ? <span className="text-[10px] text-gray-400 italic">All categories</span>
                        : (r.categorySlugs || []).slice(0, 3).map(s => (
                            <span key={s} className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">{s}</span>
                        ))
                    }
                    {(r.categorySlugs || []).length > 3 && (
                        <span className="text-[9px] text-gray-400">+{r.categorySlugs.length - 3} more</span>
                    )}
                </div>
            ),
        },
        {
            key: 'cards', label: 'Cards', render: r => (
                <span className="text-[11px] font-bold text-gray-600">
                    {(r.subcategoryCards || []).length} cards
                </span>
            ),
        },
        { key: 'sortOrder', label: 'Order', render: r => <span className="text-[11px] font-mono text-gray-500">{r.sortOrder}</span> },
        {
            key: 'status', label: 'Status', render: r => (
                isSuperAdmin ? (
                    <Badge variant={r.isActive ? 'green' : 'red'} size="sm">{r.isActive ? 'Active' : 'Inactive'}</Badge>
                ) : (
                    <button onClick={e => { e.stopPropagation(); handleToggle(r) }}>
                        <Badge variant={r.isActive ? 'green' : 'red'} size="sm">{r.isActive ? 'Active' : 'Inactive'}</Badge>
                    </button>
                )
            ),
        },
        {
            key: 'actions', label: '', render: r => (
                <div className="flex gap-3 justify-end pr-4">
                    <button onClick={e => { e.stopPropagation(); handleEdit(r) }} className="text-[10px] text-primary-600 font-bold hover:underline">EDIT</button>
                </div>
            ),
        },
    ].filter(col => !isSuperAdmin || col.key !== 'actions')

    // Expanded row: shows subcategory cards
    const renderExpanded = (r) => (
        <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
            {(r.subcategoryCards || []).length === 0
                ? <p className="px-4 py-3 text-[11px] text-gray-400 italic">No subcategory cards configured.</p>
                : (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Icon</th>
                                <th className="px-4 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Slug</th>
                                <th className="px-4 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Label</th>
                                <th className="px-4 py-2 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">Image</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {r.subcategoryCards.map((c, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-2 text-lg">{c.icon || '—'}</td>
                                    <td className="px-4 py-2 text-[10px] font-mono text-gray-600">{c.slug}</td>
                                    <td className="px-4 py-2 text-[11px] font-bold text-gray-700">{c.label}</td>
                                    <td className="px-4 py-2 text-[10px] text-gray-400 truncate max-w-[200px]">{c.imageUrl || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            }
        </div>
    )

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <PageHeader
                title="Collections"
                subtitle="Manage home screen tab bar — All, Groceries, Legal, Doctors..."
                action={(user?.role === 'admin') && (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setBulkOpen(true)}>Bulk Create</Button>
                        <Button variant="primary" onClick={() => { setForm(EMPTY_FORM); setIsEdit(false); setAddOpen(true) }}>+ Add Collection</Button>
                    </div>
                )}
            />

            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search by name or slug..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-0 focus:outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:ring-0 bg-white"
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                >
                    <option value="">All Types</option>
                    {CATEGORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:ring-0 bg-white"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                </select>

                <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} collections</span>
            </div>

            <Grid
                columns={columns}
                data={filtered}
                loading={loading}
                showSearch={false}
                renderExpanded={renderExpanded}
            />

            {/* Create / Edit Modal */}
            <Modal
                open={addOpen}
                onClose={() => { setAddOpen(false); setIsEdit(false) }}
                title={isEdit ? `Edit: ${form.name}` : 'Create Collection'}
                size="xl"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setAddOpen(false); setIsEdit(false) }}>Cancel</Button>
                        <Button variant="primary" loading={saving} onClick={handleSave}>{isEdit ? 'Update' : 'Create'}</Button>
                    </>
                }
            >
                <div className="space-y-8">

                    {/* Core */}
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-primary-600 rounded-full" />
                            Core Info
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Slug *"
                                placeholder="e.g. groceries"
                                value={form.slug}
                                onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                disabled={isEdit}
                            />
                            <Input label="Name *" placeholder="e.g. Groceries" value={form.name} onChange={e => set('name', e.target.value)} />
                            <Input label="Title *" placeholder="e.g. Fresh Groceries" value={form.title} onChange={e => set('title', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Icon (emoji)" placeholder="🛒" value={form.icon} onChange={e => set('icon', e.target.value)} />
                            <Input label="Image URL" placeholder="Tab bar image (optional)" value={form.image_url} onChange={e => set('image_url', e.target.value)} />
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-500">Sort Order</label>
                                <input
                                    type="number"
                                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:ring-0"
                                    value={form.sort_order}
                                    onChange={e => set('sort_order', parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Banner */}
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-primary-600 rounded-full" />
                            Banner (shown on collection home page)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Banner Image URL" value={form.banner_url} onChange={e => set('banner_url', e.target.value)} />
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-gray-500">Banner Background Color</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="color"
                                        value={form.banner_color}
                                        onChange={e => set('banner_color', e.target.value)}
                                        className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                                    />
                                    <input
                                        type="text"
                                        value={form.banner_color}
                                        onChange={e => set('banner_color', e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Banner Title" placeholder="e.g. SUMMER VACATION" value={form.banner_title} onChange={e => set('banner_title', e.target.value)} />
                            <Input label="Banner Subtitle" placeholder="e.g. Delivered in minutes" value={form.banner_subtitle} onChange={e => set('banner_subtitle', e.target.value)} />
                        </div>
                        {form.banner_url && (
                            <div className="rounded-lg overflow-hidden border border-gray-100" style={{ background: form.banner_color }}>
                                <img src={form.banner_url} alt="banner preview" className="w-full h-28 object-cover" onError={e => { e.target.style.display = 'none' }} />
                            </div>
                        )}
                    </section>

                    {/* Categories */}
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-primary-600 rounded-full" />
                            Category Filtering
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select label="Category Type" value={form.category_type} onChange={e => set('category_type', e.target.value)}>
                                {CATEGORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                            <Input
                                label="Category Slugs"
                                placeholder="dairy, snacks, beverages (comma-separated, empty = all)"
                                value={form.category_slugs}
                                onChange={e => set('category_slugs', e.target.value)}
                            />
                        </div>
                    </section>

                    {/* Subcategory cards */}
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1 h-3 bg-primary-600 rounded-full" />
                            Subcategory Cards
                            <span className="text-gray-300 normal-case font-normal text-[9px]">grid shown on collection page (like Blinkit Vacations)</span>
                        </h4>
                        <SubcategoryCardEditor
                            cards={form.subcategory_cards}
                            onChange={v => set('subcategory_cards', v)}
                        />
                    </section>

                    {/* Settings */}
                    <section>
                        <div className="flex gap-8 p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => set('is_active', e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-primary-600"
                                />
                                <div>
                                    <p className="text-[11px] font-bold text-gray-900">Active</p>
                                    <p className="text-[9px] text-gray-400">Show in tab bar</p>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>
            </Modal>

            {/* Bulk Upload Modal */}
            <BulkCollectionModal
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                onDone={() => dispatch(fetchCollections())}
            />
        </div>
    )
}