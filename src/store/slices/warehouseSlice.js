// src/store/slices/warehouseSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchWarehouses = createAsyncThunk(
  'warehouse/fetchAll',
  async (_, { rejectWithValue }) => {
    const res = await api.get('/warehouses')
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  },
  {
    condition: (_, { getState }) => {
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

const warehouseSlice = createSlice({
  name: 'warehouse',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWarehouseError: (state) => { state.error = null },
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
  },
})

export const selectAllWarehouses = (state) => state.warehouse.list
export const selectWarehouseLoading = (state) => state.warehouse.loading
export const selectWarehouseError = (state) => state.warehouse.error

export const { clearWarehouseError } = warehouseSlice.actions
export default warehouseSlice.reducer
