import { useState, useMemo } from 'react'
import Table from './Table'
import Input from './Input'
import Button from './Button'

/**
 * Reusable Grid Component
 * Wraps Table with Search and Pagination
 */
export default function Grid({
  columns,
  data = [],
  loading,
  emptyText,
  searchPlaceholder = "Search...",
  // If search is handled externally (e.g. via Redux), pass these:
  externalSearchValue,
  onSearchChange,
  // If search is handled internally:
  searchKey, // key to search on, or function
  pageSize = 10,
  actions, // Extra buttons/filters next to search
  showSearch = true,
  pagination = true,
  renderExpanded,
  rowClassName,
  // Server-side pagination parameters:
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  onLimitChange,
}) {
  const [internalSearch, setInternalSearch] = useState('')
  const [internalPage, setInternalPage] = useState(1)

  const isExternalSearch = onSearchChange !== undefined
  const isServerPagination = onPageChange !== undefined

  const searchValue = isExternalSearch ? externalSearchValue : internalSearch
  const activePage = isServerPagination ? currentPage : internalPage

  // Filtering (only if not external)
  const filteredData = useMemo(() => {
    if (isExternalSearch || !searchValue || !searchKey) return data
    const query = searchValue.toLowerCase()
    return data.filter(item => {
      if (typeof searchKey === 'function') return searchKey(item, query)
      const val = item[searchKey]
      return String(val || '').toLowerCase().includes(query)
    })
  }, [data, searchValue, searchKey, isExternalSearch])

  // Pagination
  const activeTotalPages = isServerPagination ? totalPages : Math.ceil(filteredData.length / pageSize)
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData
    if (isServerPagination) return filteredData // data is already paginated on server
    const start = (activePage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, activePage, pageSize, pagination, isServerPagination])

  const handleSearch = (val) => {
    if (isExternalSearch) {
      onSearchChange(val)
    } else {
      setInternalSearch(val)
    }
    if (isServerPagination) {
      onPageChange(1)
    } else {
      setInternalPage(1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Grid Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
        <div className="flex-1 flex gap-2 w-full">
          {showSearch && (
            <div className="w-full md:w-80">
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                className="mb-0"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {actions}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <Table
          columns={columns}
          data={paginatedData}
          loading={loading}
          emptyText={emptyText}
          renderExpanded={renderExpanded}
          rowClassName={rowClassName}
        />
      </div>

      {/* Pagination */}
      {pagination && activeTotalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl">
          <p className="text-sm text-gray-500">
            {isServerPagination ? (
              <>
                Showing <span className="font-medium">{(activePage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(activePage * pageSize, totalItems)}</span> of <span className="font-medium">{totalItems}</span> results
              </>
            ) : (
              <>
                Showing <span className="font-medium">{(activePage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(activePage * pageSize, filteredData.length)}</span> of <span className="font-medium">{filteredData.length}</span> results
              </>
            )}
          </p>
          <div className="flex items-center gap-4">
            {isServerPagination && onLimitChange && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => onLimitChange(Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white font-semibold text-gray-600 focus:outline-none cursor-pointer"
                >
                  {[10, 25, 50, 100].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={activePage === 1}
                onClick={() => isServerPagination ? onPageChange(activePage - 1) : setInternalPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={activePage === activeTotalPages}
                onClick={() => isServerPagination ? onPageChange(activePage + 1) : setInternalPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
