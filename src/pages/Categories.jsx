// src/pages/Categories.jsx
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as XLSX from 'xlsx'
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
  addSubcategory, updateSubcategory, deleteSubcategory,
  bulkUploadCategories,
  selectAllCategories, selectCategoryLoading,
} from '../store/slices/categorySlice'
import { showToast } from '../store/slices/uiSlice'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Input from '../components/Input'
import ImageInput from '../components/Imageinput'
import BulkUploadModal from '../components/BulkUploadModal'
import Grid from '../components/Grid'

const CAT_INIT = {
  category_code: '', name: '', slug: '', title: '',
  icon: '', image: '', sortOrder: '0', type: 'product', is_active: true,
}

const SUB_INIT = {
  subcategory_code: '', name: '', slug: '', title: '',
  icon: '', image: '', is_active: true,
}

const SCHEMA_FIELDS = [
  'category_code', 'category_name', 'category_slug', 'category_title',
  'category_icon', 'category_image_url', 'type', 'sort_order',
  'subcategory_code', 'subcategory_name', 'subcategory_slug', 'subcategory_title',
  'subcategory_icon', 'subcategory_image_url',
]

const genSlug = (s) =>
  (s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const CategoryCard = ({ cat, openEditCat, openAddSub, openEditSub }) => {
  const [open, setOpen] = useState(false);
  const subCount = cat.subcategories?.length || 0;

  return (
    <div className="card mb-4">
      <div className="card-header cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 flex-1">
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="5,3 11,8 5,13" />
          </svg>
          {cat.image || cat.image_url
            ? <img src={cat.image || cat.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
            : <span className="text-2xl">{cat.icon || '📦'}</span>
          }
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{cat.name}</p>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-mono">{cat.category_code}</span>
            </div>
            <p className="text-xs text-gray-400">{cat.title}</p>
          </div>
        </div>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onClick={() => openEditCat(cat)}>✏️ Edit</Button>
          <Button variant="secondary" size="sm" onClick={() => openAddSub(cat)}>+ Sub</Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-5 py-3">
          {subCount === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No subcategories yet</p>
          ) : (
            <div className="space-y-2">
              {cat.subcategories.map(sub => (
                <div key={sub._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                  <span className="flex-1">{sub.name}</span>
                  <button onClick={() => openEditSub(cat, sub)} className="text-blue-400 hover:text-blue-600">✏️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Categories() {
  const dispatch = useDispatch()
  const categories = useSelector(selectAllCategories)
  const loading = useSelector(selectCategoryLoading)

  const [catModal, setCatModal] = useState(false)
  const [subModal, setSubModal] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [editingSub, setEditingSub] = useState(null)
  const [catForm, setCatForm] = useState(CAT_INIT)
  const [subForm, setSubForm] = useState(SUB_INIT)
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchCategories()) }, [dispatch])

  const downloadCSVTemplate = () => {
    const headerLine = SCHEMA_FIELDS.join(',')
    const exampleRows = [
      'C001,Dairy,dairy,Fresh Dairy Products,📦,https://example.com/dairy.jpg,product,1,S001,Milk,milk,Fresh Milk,🥛,https://example.com/milk.jpg',
      'C001,Dairy,dairy,Fresh Dairy Products,📦,https://example.com/dairy.jpg,product,1,S002,Curd,curd,Fresh Curd,🥣,https://example.com/curd.jpg',
    ]
    const content = [headerLine, ...exampleRows].join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'categories_template.csv'
    a.click()
  }

  const downloadXLSXTemplate = () => {
    const rows = [
      SCHEMA_FIELDS,
      ['C001','Dairy','dairy','Fresh Dairy Products','📦','https://example.com/dairy.jpg','product',1,'S001','Milk','milk','Fresh Milk','🥛','https://example.com/milk.jpg'],
      ['C001','Dairy','dairy','Fresh Dairy Products','📦','https://example.com/dairy.jpg','product',1,'S002','Curd','curd','Fresh Curd','🥣','https://example.com/curd.jpg'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Categories')
    import('xlsx').then(XLSX => XLSX.writeFile(wb, 'categories_template.xlsx'))
  }

  const handleSaveCat = async () => {
    setSaving(true)
    const payload = { ...catForm, sortOrder: parseInt(catForm.sortOrder) || 0 }
    const res = editingCat 
      ? await dispatch(updateCategory({ id: editingCat._id, data: payload }))
      : await dispatch(createCategory(payload))
    setSaving(false)
    if (!res.error) setCatModal(false)
  }

  const handleSaveSub = async () => {
    setSaving(true)
    const res = editingSub
      ? await dispatch(updateSubcategory({ categoryId: editingSub.catId, subId: editingSub.sub._id, data: subForm }))
      : await dispatch(addSubcategory({ categoryId: subModal.category._id, data: subForm }))
    setSaving(false)
    if (!res.error) setSubModal(null)
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Manage product and service categories"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>📤 Bulk Upload</Button>
            <Button variant="primary" onClick={() => { setEditingCat(null); setCatForm(CAT_INIT); setCatModal(true) }}>+ Add Category</Button>
          </div>
        }
      />

      {loading ? <div className="py-10 text-center text-gray-400">Loading...</div> : (
        <div className="space-y-4">
          {categories.map(cat => (
            <CategoryCard
              key={cat._id}
              cat={cat}
              openEditCat={(c) => { setEditingCat(c); setCatForm(c); setCatModal(true) }}
              openAddSub={(c) => { setSubModal({ category: c }); setEditingSub(null); setSubForm(SUB_INIT) }}
              openEditSub={(c, s) => { setEditingSub({ catId: c._id, sub: s }); setSubForm(s); setSubModal({ category: c }) }}
            />
          ))}
        </div>
      )}

      {/* Category Modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title={editingCat ? "Edit Category" : "Add Category"}
             footer={<><Button variant="secondary" onClick={() => setCatModal(false)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleSaveCat}>Save</Button></>}>
        <ImageInput label="Image URL" value={catForm.image} onChange={url => setCatForm({ ...catForm, image: url })} />
        <div className="form-grid-2 mt-3">
          <Input label="Code *" value={catForm.category_code} onChange={e => setCatForm({ ...catForm, category_code: e.target.value.toUpperCase() })} />
          <Input label="Name *" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} />
        </div>
        <div className="mt-3">
          <Input label="Slug *" value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} 
                 actions={<button onClick={() => setCatForm({ ...catForm, slug: genSlug(catForm.name) })} className="text-xs text-blue-500">Auto-fill</button>} />
        </div>
      </Modal>

      {/* Subcategory Modal */}
      <Modal open={!!subModal} onClose={() => setSubModal(null)} title={editingSub ? "Edit Subcategory" : "Add Subcategory"}
             footer={<><Button variant="secondary" onClick={() => setSubModal(null)}>Cancel</Button><Button variant="primary" loading={saving} onClick={handleSaveSub}>Save</Button></>}>
        <ImageInput label="Image URL" value={subForm.image} onChange={url => setSubForm({ ...subForm, image: url })} />
        <div className="form-grid-2 mt-3">
          <Input label="Code *" value={subForm.subcategory_code} onChange={e => setSubForm({ ...subForm, subcategory_code: e.target.value.toUpperCase() })} />
          <Input label="Name *" value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} />
        </div>
      </Modal>

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Upload Categories"
        schemaFields={SCHEMA_FIELDS}
        onUpload={async (rows, file) => {
          const action = await dispatch(bulkUploadCategories(file))
          return action.payload
        }}
        downloadCSVTemplate={downloadCSVTemplate}
        downloadXLSXTemplate={downloadXLSXTemplate}
        onDone={() => dispatch(fetchCategories())}
      />
    </div>
  )
}