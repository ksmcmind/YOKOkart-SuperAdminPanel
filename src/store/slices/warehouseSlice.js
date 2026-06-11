// src/store/slices/warehouseSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

// ── Warehouses ───────────────────────────────────────────────────────────────
export const fetchWarehouses = createAsyncThunk(
  'warehouse/fetchAll',
  async (force, { rejectWithValue }) => {
    const res = await api.get('/warehouses')
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  },
  {
    condition: (force, { getState }) => {
      if (force === true) return true
      const { warehouse } = getState()
      if (warehouse.list.length > 0 && !warehouse.loading) return false
    }
  }
)

export const createWarehouse = createAsyncThunk(
  'warehouse/create',
  async (data, { rejectWithValue }) => {
    const res = await api.post('/warehouses', data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateWarehouse = createAsyncThunk(
  'warehouse/update',
  async ({ id, data }, { rejectWithValue }) => {
    const res = await api.put(`/warehouses/${id}`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const toggleWarehouseStatus = createAsyncThunk(
  'warehouse/toggleStatus',
  async ({ id, is_active }, { rejectWithValue }) => {
    const res = await api.put(`/warehouses/${id}`, { is_active })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

// ── Warehouse Inventory & Batches ─────────────────────────────────────────────
export const fetchWarehouseInventorySummary = createAsyncThunk(
  'warehouse/fetchInventorySummary',
  async (warehouseId, { rejectWithValue }) => {
    const res = await api.get(`/warehouse-inventory/warehouse/${warehouseId}/summary`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const fetchWarehouseInventoryRows = createAsyncThunk(
  'warehouse/fetchInventoryRows',
  async ({ warehouseId, page, limit, filter, search }, { rejectWithValue }) => {
    const params = new URLSearchParams({ page, limit, filter })
    if (search) params.set('search', search)
    const res = await api.get(`/warehouse-inventory/warehouse/${warehouseId}?${params.toString()}`)
    if (!res.success) return rejectWithValue(res.message)
    return { data: res.data || [], pagination: res.pagination }
  }
)

export const fetchWarehouseBatches = createAsyncThunk(
  'warehouse/fetchBatches',
  async ({ warehouseId, page, limit, expiring_soon, expired_only, search }, { rejectWithValue }) => {
    const params = new URLSearchParams({ page, limit })
    if (expiring_soon) params.set('expiring_soon', 'true')
    if (expired_only) params.set('expired_only', 'true')
    if (search) params.set('search', search)
    const res = await api.get(`/warehouse-inventory/warehouse/${warehouseId}/batches?${params.toString()}`)
    if (!res.success) return rejectWithValue(res.message)
    return { data: res.data || [], pagination: res.pagination }
  }
)

export const addWarehouseStock = createAsyncThunk(
  'warehouse/addStock',
  async (payload, { rejectWithValue }) => {
    const res = await api.post('/warehouse-inventory/add-stock', payload)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const adjustWarehouseStock = createAsyncThunk(
  'warehouse/adjustStock',
  async (payload, { rejectWithValue }) => {
    const res = await api.post('/warehouse-inventory/adjust-stock', payload)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const bulkUploadWarehouseInventory = createAsyncThunk(
  'warehouse/bulkUploadInventory',
  async ({ warehouseId, formData }, { rejectWithValue }) => {
    const res = await api.post(`/warehouse-inventory/bulk?warehouseId=${warehouseId}`, formData)
    if (!res.success) return rejectWithValue(res)
    return res.data
  }
)

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const fetchSuppliers = createAsyncThunk(
  'warehouse/fetchSuppliers',
  async ({ active }, { rejectWithValue }) => {
    const activeParam = active ? 'true' : 'false'
    const res = await api.get(`/warehouse-inventory/suppliers?active=${activeParam}`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data || []
  }
)

export const createSupplier = createAsyncThunk(
  'warehouse/createSupplier',
  async (data, { rejectWithValue }) => {
    const res = await api.post('/warehouse-inventory/suppliers', data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateSupplier = createAsyncThunk(
  'warehouse/updateSupplier',
  async ({ id, data }, { rejectWithValue }) => {
    const res = await api.put(`/warehouse-inventory/suppliers/${id}`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const toggleSupplierStatus = createAsyncThunk(
  'warehouse/toggleSupplierStatus',
  async ({ id, active }, { rejectWithValue }) => {
    const res = await api.patch(`/warehouse-inventory/suppliers/${id}/status`, { active })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const bulkUploadSuppliers = createAsyncThunk(
  'warehouse/bulkUploadSuppliers',
  async (formData, { rejectWithValue }) => {
    const res = await api.post('/warehouse-inventory/suppliers/bulk', formData)
    if (!res.success) return rejectWithValue(res)
    return res.data
  }
)

// ── Purchase Orders & Receipts ───────────────────────────────────────────────
export const fetchPOs = createAsyncThunk(
  'warehouse/fetchPOs',
  async (warehouseId, { rejectWithValue }) => {
    const res = await api.get(`/warehouse-inventory/purchase-orders?warehouseId=${warehouseId}`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data || []
  }
)

export const createPO = createAsyncThunk(
  'warehouse/createPO',
  async (payload, { rejectWithValue }) => {
    const res = await api.post('/warehouse-inventory/purchase-orders', payload)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updatePOStatus = createAsyncThunk(
  'warehouse/updatePOStatus',
  async ({ id, status }, { rejectWithValue }) => {
    const res = await api.post(`/warehouse-inventory/purchase-orders/${id}/status`, { status })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const receiveGoods = createAsyncThunk(
  'warehouse/receiveGoods',
  async ({ id, payload }, { rejectWithValue }) => {
    const res = await api.post(`/warehouse-inventory/purchase-orders/${id}/receive`, payload)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const fetchPODetails = createAsyncThunk(
  'warehouse/fetchPODetails',
  async (id, { rejectWithValue }) => {
    const res = await api.get(`/warehouse-inventory/purchase-orders/${id}`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateStockReceipt = createAsyncThunk(
  'warehouse/updateStockReceipt',
  async ({ id, payload }, { rejectWithValue }) => {
    const res = await api.put(`/warehouse-inventory/purchase-orders/receipts/${id}`, payload)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const bulkUploadPOs = createAsyncThunk(
  'warehouse/bulkUploadPOs',
  async ({ warehouseId, formData }, { rejectWithValue }) => {
    const res = await api.post(`/warehouse-inventory/purchase-orders/bulk-parse`, formData)
    if (!res.success) return rejectWithValue(res)
    return res
  }
)

// ── Slice ────────────────────────────────────────────────────────────────────
const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState: {
    list: [],
    loading: false,
    error: null,
    inventorySummary: null,
    inventoryRows: [],
    inventoryPagination: null,
    batches: [],
    batchesPagination: null,
    suppliers: [],
    purchaseOrders: [],
    poDetails: null,
    selectedWarehouseId: '',
    summaryPage: 1,
    summaryLimit: 25,
    batchesPage: 1,
    batchesLimit: 25,
    activeTab: 'summary',
  },
  reducers: {
    clearWarehouseError: (state) => { state.error = null },
    setSelectedWarehouseId: (state, action) => { state.selectedWarehouseId = action.payload },
    setSummaryPage: (state, action) => { state.summaryPage = action.payload },
    setSummaryLimit: (state, action) => { state.summaryLimit = action.payload },
    setBatchesPage: (state, action) => { state.batchesPage = action.payload },
    setBatchesLimit: (state, action) => { state.batchesLimit = action.payload },
    setActiveTab: (state, action) => { state.activeTab = action.payload },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWarehouses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.loading = false
        state.list = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchWarehouses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
      })

      .addCase(updateWarehouse.fulfilled, (state, action) => {
        const idx = state.list.findIndex(w => w.warehouse_id === action.payload.warehouse_id)
        if (idx !== -1) state.list[idx] = action.payload
      })

      .addCase(toggleWarehouseStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex(w => w.warehouse_id === action.payload.warehouse_id)
        if (idx !== -1) state.list[idx] = action.payload
      })

      .addCase(fetchWarehouseInventorySummary.fulfilled, (state, action) => {
        state.inventorySummary = action.payload
      })

      .addCase(fetchWarehouseInventoryRows.fulfilled, (state, action) => {
        state.inventoryRows = action.payload.data
        state.inventoryPagination = action.payload.pagination
      })

      .addCase(fetchWarehouseBatches.fulfilled, (state, action) => {
        state.batches = action.payload.data
        state.batchesPagination = action.payload.pagination
      })

      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.suppliers = action.payload
      })

      .addCase(fetchPOs.fulfilled, (state, action) => {
        state.purchaseOrders = action.payload
      })

      .addCase(fetchPODetails.fulfilled, (state, action) => {
        state.poDetails = action.payload
      })
  },
})

export const selectAllWarehouses = (state) => state.warehouse.list
export const selectWarehouseLoading = (state) => state.warehouse.loading
export const selectWarehouseError = (state) => state.warehouse.error

export const selectWarehouseInventorySummary = (state) => state.warehouse.inventorySummary
export const selectWarehouseInventoryRows = (state) => state.warehouse.inventoryRows
export const selectWarehouseInventoryPagination = (state) => state.warehouse.inventoryPagination
export const selectWarehouseBatches = (state) => state.warehouse.batches
export const selectWarehouseBatchesPagination = (state) => state.warehouse.batchesPagination
export const selectWarehouseSuppliers = (state) => state.warehouse.suppliers
export const selectWarehousePOs = (state) => state.warehouse.purchaseOrders
export const selectWarehousePODetails = (state) => state.warehouse.poDetails

export const {
  clearWarehouseError,
  setSelectedWarehouseId,
  setSummaryPage,
  setSummaryLimit,
  setBatchesPage,
  setBatchesLimit,
  setActiveTab
} = warehouseSlice.actions
export default warehouseSlice.reducer
