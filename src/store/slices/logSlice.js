// src/store/slices/logSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchBatchMovements = createAsyncThunk(
  'logs/fetchBatchMovements',
  async (params, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString()
      const res = await api.get(`/warehouse-inventory/logs/batch-movements?${query}`)
      if (!res.success) return rejectWithValue(res.message)
      return res
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const fetchStockTransfers = createAsyncThunk(
  'logs/fetchStockTransfers',
  async (params, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString()
      const res = await api.get(`/warehouse-transfers/logs?${query}`)
      if (!res.success) return rejectWithValue(res.message)
      return res
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const fetchGoodsReceipts = createAsyncThunk(
  'logs/fetchGoodsReceipts',
  async (params, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString()
      const res = await api.get(`/warehouse-inventory/logs/receipts?${query}`)
      if (!res.success) return rejectWithValue(res.message)
      return res
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

const logSlice = createSlice({
  name: 'logs',
  initialState: {
    movements: {
      list: [],
      pagination: null,
      loading: false,
      error: null,
    },
    transfers: {
      list: [],
      pagination: null,
      loading: false,
      error: null,
    },
    receipts: {
      list: [],
      pagination: null,
      loading: false,
      error: null,
    },
  },
  reducers: {},
  extraReducers: (builder) => {
    // Batch Movements
    builder
      .addCase(fetchBatchMovements.pending, (state) => {
        state.movements.loading = true
        state.movements.error = null
      })
      .addCase(fetchBatchMovements.fulfilled, (state, action) => {
        state.movements.loading = false
        state.movements.list = action.payload.data || []
        state.movements.pagination = action.payload.pagination || null
      })
      .addCase(fetchBatchMovements.rejected, (state, action) => {
        state.movements.loading = false
        state.movements.error = action.payload
      })

    // Stock Transfers
    builder
      .addCase(fetchStockTransfers.pending, (state) => {
        state.transfers.loading = true
        state.transfers.error = null
      })
      .addCase(fetchStockTransfers.fulfilled, (state, action) => {
        state.transfers.loading = false
        state.transfers.list = action.payload.data || []
        state.transfers.pagination = action.payload.pagination || null
      })
      .addCase(fetchStockTransfers.rejected, (state, action) => {
        state.transfers.loading = false
        state.transfers.error = action.payload
      })

    // Goods Receipts
    builder
      .addCase(fetchGoodsReceipts.pending, (state) => {
        state.receipts.loading = true
        state.receipts.error = null
      })
      .addCase(fetchGoodsReceipts.fulfilled, (state, action) => {
        state.receipts.loading = false
        state.receipts.list = action.payload.data || []
        state.receipts.pagination = action.payload.pagination || null
      })
      .addCase(fetchGoodsReceipts.rejected, (state, action) => {
        state.receipts.loading = false
        state.receipts.error = action.payload
      })
  },
})

export const selectBatchMovements = (state) => state.logs.movements
export const selectStockTransfers = (state) => state.logs.transfers
export const selectGoodsReceipts = (state) => state.logs.receipts

export default logSlice.reducer
