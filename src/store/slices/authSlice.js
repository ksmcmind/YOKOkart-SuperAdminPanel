// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

// ── Async thunks ──────────────────────────────────────────────

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (phone, { rejectWithValue }) => {
    const res = await api.post('/auth/send-otp', { phone, userType: 'staff' })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, otp }, { rejectWithValue }) => {
    const res = await api.post('/auth/verify-otp', { phone, otp, userType: 'staff' })
    if (!res.success) return rejectWithValue(res.message)

    if (res.data.user.role !== 'super_admin' && res.data.user.role !== 'admin') {
      return rejectWithValue('Access denied.')
    }

    // Note: token is set in HttpOnly cookie by backend
    localStorage.setItem('ksmcm_user',  JSON.stringify(res.data.user))
    return res.data
  }
)

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/auth/me')
      if (!res.success) throw new Error(res.message)
      localStorage.setItem('ksmcm_user', JSON.stringify(res.data.user))
      return res.data
    } catch (err) {
      localStorage.removeItem('ksmcm_user')
      return rejectWithValue(err.message)
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout')
    } catch (e) {}
    localStorage.removeItem('ksmcm_user')
  }
)

// ── Slice ─────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:        JSON.parse(localStorage.getItem('ksmcm_user') || 'null'),
    isLoggedIn:  !!localStorage.getItem('ksmcm_user'),
    isInitialized: false, // Wait for getMe to finish
    otpSent:     false,
    loading:     false,
    error:       null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(sendOtp.fulfilled, (state) => { state.loading = false; state.otpSent = true })
      .addCase(sendOtp.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(verifyOtp.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false
        state.user    = action.payload.user
        state.isLoggedIn = true
      })
      .addCase(verifyOtp.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(getMe.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.isLoggedIn = true
        state.isInitialized = true
      })
      .addCase(getMe.rejected, (state) => {
        state.user = null
        state.isLoggedIn = false
        state.isInitialized = true
      })

      .addCase(logout.fulfilled, (state) => {
        state.user    = null
        state.isLoggedIn = false
        state.otpSent = false
      })
  },
})

// ── Selectors ─────────────────────────────────────────────────
export const selectUser     = (state) => state.auth.user
export const selectIsLoggedIn = (state) => state.auth.isLoggedIn
export const selectIsInitialized = (state) => state.auth.isInitialized
export const selectOtpSent  = (state) => state.auth.otpSent
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthError   = (state) => state.auth.error

export const { clearError } = authSlice.actions
export default authSlice.reducer