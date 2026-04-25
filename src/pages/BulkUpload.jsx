// src/pages/BulkUpload.jsx
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import * as XLSX from 'xlsx'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import BulkUploadModal from '../components/BulkUploadModal'
import { bulkUploadProducts } from '../store/slices/productSlice'
import { bulkUploadCategories } from '../store/slices/categorySlice'

const UPLOAD_TYPES = [
  {
    id: 'products',
    name: 'Products',
    description: 'Bulk upload global product catalog with variants',
    icon: '📦',
    schemaFields: [
      'name', 'brand', 'description', 'category_slug', 'subcategory_slug',
      'search_keywords', 'tags', 'is_active', 'is_veg', 'return_policy',
      'hsn_code', 'gst_percentage', 'variant_id', 'variant_name',
      'display_size', 'sku', 'barcode', 'plu_code', 'details', 'images',
      'is_active_variant',
    ],
    onUpload: async (dispatch, file) => {
      const action = await dispatch(bulkUploadProducts(file))
      return action.payload
    },
    downloadCSV: (fields) => {
      const comments = [
        '# Super Admin Product Catalog — CSV Template',
        '# Each row = ONE VARIANT. Multiple variants of the same product:',
        '# repeat rows with the same name+brand.',
        '',
      ]
      const headerLine = fields.join(',')
      const exampleRow = [
        'Amul Taaza Milk', 'Amul', 'Fresh milk', 'dairy', 'milk-curd',
        'amul|milk', 'daily', 'true', 'true', 'No return', '0401', '5',
        'VID-AMUL-500', 'Amul Taaza 500ml', '500ml', 'SKU-AMUL-500', '', '',
        '{"fat":"3%"}', 'https://example.com/img.jpg', 'true'
      ].join(',')
      const blob = new Blob([[...comments, headerLine, exampleRow].join('\n')], { type: 'text/csv' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'products_template.csv'; a.click()
    },
    downloadXLSX: (fields) => {
      const rows = [fields, ['Amul Taaza Milk', 'Amul', 'Fresh milk', 'dairy', 'milk-curd', 'amul|milk', 'daily', 'true', 'true', 'No return', '0401', '5', 'VID-AMUL-500', 'Amul Taaza 500ml', '500ml', 'SKU-AMUL-500', '', '', '{"fat":"3%"}', 'https://example.com/img.jpg', 'true']]
      const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Products')
      XLSX.writeFile(wb, 'products_template.xlsx')
    }
  },
  {
    id: 'categories',
    name: 'Categories',
    description: 'Bulk upload categories and subcategories',
    icon: '📁',
    schemaFields: [
      'category_code', 'category_name', 'category_slug', 'category_title',
      'category_icon', 'category_image_url', 'type', 'sort_order',
      'subcategory_code', 'subcategory_name', 'subcategory_slug', 'subcategory_title',
      'subcategory_icon', 'subcategory_image_url',
    ],
    onUpload: async (dispatch, file) => {
      const action = await dispatch(bulkUploadCategories(file))
      return action.payload
    },
    downloadCSV: (fields) => {
      const headerLine = fields.join(',')
      const exampleRow = 'C001,Dairy,dairy,Fresh Dairy,📦,https://img.jpg,product,1,S001,Milk,milk,Fresh Milk,🥛,https://img.jpg'
      const blob = new Blob([[headerLine, exampleRow].join('\n')], { type: 'text/csv' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'categories_template.csv'; a.click()
    },
    downloadXLSX: (fields) => {
      const rows = [fields, ['C001','Dairy','dairy','Fresh Dairy','📦','https://img.jpg','product',1,'S001','Milk','milk','Fresh Milk','🥛','https://img.jpg']]
      const ws = XLSX.utils.aoa_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Categories')
      XLSX.writeFile(wb, 'categories_template.xlsx')
    }
  }
]

export default function BulkUpload() {
  const dispatch = useDispatch()
  const [activeType, setActiveType] = useState(null)

  return (
    <div className="space-y-6">
      <PageHeader title="Bulk Data Management" subtitle="Upload large volumes of data using CSV or Excel templates" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {UPLOAD_TYPES.map(type => (
          <div key={type.id} className="card hover:border-primary-300 transition-all cursor-pointer" onClick={() => setActiveType(type)}>
            <div className="p-6">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-2xl mb-4">{type.icon}</div>
              <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              <div className="mt-6"><Button variant="secondary" className="w-full">Start Upload</Button></div>
            </div>
          </div>
        ))}
      </div>
      {activeType && (
        <BulkUploadModal
          open={!!activeType} onClose={() => setActiveType(null)} title={`Bulk Upload ${activeType.name}`}
          schemaFields={activeType.schemaFields}
          onUpload={(payload, file) => activeType.onUpload(dispatch, file)}
          downloadCSVTemplate={() => activeType.downloadCSV(activeType.schemaFields)}
          downloadXLSXTemplate={() => activeType.downloadXLSX(activeType.schemaFields)}
        />
      )}
    </div>
  )
}
