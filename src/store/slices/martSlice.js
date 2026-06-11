// src/store/slices/martSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchMarts = createAsyncThunk(
  'mart/fetchAll',
  async (force, { rejectWithValue }) => {
    const res = await api.get('/marts')
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  },
  {
    condition: (force, { getState }) => {
      if (force === true) return true
      const { mart } = getState()
      if (mart.list.length > 0 && !mart.loading) return false
    }
  }
)

export const fetchMartById = createAsyncThunk(
  'mart/fetchById',
  async (id, { rejectWithValue }) => {
    const res = await api.get(`/marts/${id}`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const createMart = createAsyncThunk(
  'mart/create',
  async (data, { rejectWithValue }) => {
    const res = await api.post('/marts', data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const toggleMartStatus = createAsyncThunk(
  'mart/toggle',
  async ({ martId, is_active }, { rejectWithValue }) => {
    const res = await api.patch(`/marts/${martId}/toggle`, { is_active })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateMart = createAsyncThunk(
  'mart/update',
  async ({ id, data }, { rejectWithValue }) => {
    const res = await api.patch(`/marts/${id}`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const setMartStatus = createAsyncThunk(
  'mart/setStatus',
  async ({ id, status }, { rejectWithValue }) => {
    // ✅ FIX: backend expects { notice } not { status }
    const res = await api.patch(`/marts/${id}/status`, { notice: status })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

const martSlice = createSlice({
  name: 'mart',
  initialState: {
    list: [],
    selected: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedMart: (state, action) => { state.selected = action.payload },
    clearMartError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarts.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMarts.fulfilled, (state, action) => { state.loading = false; state.list = Array.isArray(action.payload) ? action.payload : [] })
      .addCase(fetchMarts.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchMartById.fulfilled, (state, action) => {
        state.selected = action.payload
        const idx = state.list.findIndex(m => m.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })

      .addCase(createMart.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
      })

      .addCase(toggleMartStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex(m => m.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })

      .addCase(setMartStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex(m => m.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })

      .addCase(updateMart.fulfilled, (state, action) => {
        const idx = state.list.findIndex(m => m.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })
  },
})

export const selectAllMarts = (state) => state.mart.list
export const selectSelectedMart = (state) => state.mart.selected
export const selectMartsLoading = (state) => state.mart.loading
export const selectMartsError = (state) => state.mart.error
export const selectOpenMarts = (state) => state.mart.list.filter(m => m.status === 'open' && m.is_active)

export const { setSelectedMart, clearMartError } = martSlice.actions
export default martSlice.reducer