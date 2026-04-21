// src/store/slices/orderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchOrders = createAsyncThunk(
  'order/fetchAll',
  async ({ martId, status = '' }, { rejectWithValue }) => {
    const res = await api.get(`/orders/mart?martId=${martId}&status=${status}`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateOrderStatus = createAsyncThunk(
  'order/updateStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    const res = await api.patch(`/orders/${orderId}/status`, { status })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

const orderSlice = createSlice({
  name: 'order',
  initialState: {
    list:    [],
    loading: false,
    error:   null,
    filter:  '',
  },
  reducers: {
    setOrderFilter: (state, action) => { state.filter = action.payload },
    clearOrderError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false
        state.list    = action.payload || []
      })
      .addCase(fetchOrders.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

    builder
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex(o => o.id === action.payload.id)
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload }
      })
  },
})

export const selectAllOrders   = (state) => state.order.list
export const selectOrderLoading = (state) => state.order.loading
export const selectOrderError   = (state) => state.order.error
export const selectOrderFilter  = (state) => state.order.filter

export const { setOrderFilter, clearOrderError } = orderSlice.actions
export default orderSlice.reducer