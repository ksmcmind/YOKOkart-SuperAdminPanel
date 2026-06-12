// src/store/slices/staffSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchStaff = createAsyncThunk(
  'staff/fetchAll',
  async (arg, { rejectWithValue }) => {
    let url = '/staff'
    if (arg && typeof arg === 'string') {
      url = `/staff?martId=${arg}`
    } else if (arg && typeof arg === 'object' && arg.martId) {
      url = `/staff?martId=${arg.martId}`
    }
    const res = await api.get(url)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  },
  {
    condition: (arg, { getState }) => {
      if (arg === true || (arg && arg.force === true)) return true
      if (typeof arg === 'string' || (arg && arg.martId)) return true
      const { staff } = getState()
      if (staff.list.length > 0 && !staff.loading) return false
    }
  }
)

export const createStaff = createAsyncThunk(
  'staff/create',
  async (data, { rejectWithValue }) => {
    const res = await api.post('/staff', data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateStaff = createAsyncThunk(
  'staff/update',
  async ({ id, data }, { rejectWithValue }) => {
    const res = await api.patch(`/staff/${id}`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const toggleStaffStatus = createAsyncThunk(
  'staff/toggle',
  async (arg, { rejectWithValue }) => {
    const id = typeof arg === 'object' ? arg.id : arg
    const data = typeof arg === 'object' ? { deactivation_reason: arg.deactivation_reason } : null
    const res = await api.patch(`/staff/${id}/toggle`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const fetchStaffRoles = createAsyncThunk(
  'staff/fetchRoles',
  async (_, { rejectWithValue }) => {
    const res = await api.get('/staff/roles')
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

const staffSlice = createSlice({
  name: 'staff',
  initialState: {
    list:    [],
    roles:   [],
    loading: false,
    error:   null,
  },
  reducers: {
    clearStaffError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.loading = false
        state.list    = action.payload || []
      })
      .addCase(fetchStaff.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

    builder
      .addCase(createStaff.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
      })

    builder
      .addCase(updateStaff.fulfilled, (state, action) => {
        const idx = state.list.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })

    builder
      .addCase(toggleStaffStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
      })

    builder
      .addCase(fetchStaffRoles.fulfilled, (state, action) => {
        state.roles = action.payload || []
      })
  },
})

export const selectAllStaff    = (state) => state.staff.list
export const selectAllStaffRoles = (state) => state.staff.roles
export const selectStaffLoading = (state) => state.staff.loading
export const selectStaffError   = (state) => state.staff.error

export const { clearStaffError } = staffSlice.actions
export default staffSlice.reducer