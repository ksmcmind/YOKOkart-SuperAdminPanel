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

    // Only super_admin allowed in this panel
    if (res.data.user.role !== 'super_admin') {
      return rejectWithValue('Access denied. Super admin only.')
    }

    // Save to localStorage
    localStorage.setItem('ksmcm_token', res.data.token)
    localStorage.setItem('ksmcm_user',  JSON.stringify(res.data.user))

    return res.data
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout')
    } catch (e) {}
    localStorage.removeItem('ksmcm_token')
    localStorage.removeItem('ksmcm_user')
  }
)

// ── Slice ─────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:        JSON.parse(localStorage.getItem('ksmcm_user') || 'null'),
    token:       localStorage.getItem('ksmcm_token') || null,
    otpSent:     false,
    loading:     false,
    error:       null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    // Send OTP
    builder
      .addCase(sendOtp.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(sendOtp.fulfilled, (state) => { state.loading = false; state.otpSent = true })
      .addCase(sendOtp.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

    // Verify OTP
    builder
      .addCase(verifyOtp.pending,   (state) => { state.loading = true;  state.error = null })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false
        state.token   = action.payload.token
        state.user    = action.payload.user
      })
      .addCase(verifyOtp.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user    = null
        state.token   = null
        state.otpSent = false
      })
  },
})

// ── Selectors ─────────────────────────────────────────────────
export const selectUser     = (state) => state.auth.user
export const selectToken    = (state) => state.auth.token
export const selectOtpSent  = (state) => state.auth.otpSent
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthError   = (state) => state.auth.error
export const selectIsLoggedIn  = (state) => !!state.auth.token

export const { clearError } = authSlice.actions
export default authSlice.reducer