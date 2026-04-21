// src/store/slices/productSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

export const fetchProducts = createAsyncThunk(
  'product/fetchAll',
  async ({ martId, categoryId }, { rejectWithValue }) => {
    const res = await api.get(`/products?martId=${martId}&categoryId=${categoryId}&inStockOnly=false`)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const createProduct = createAsyncThunk(
  'product/create',
  async (data, { rejectWithValue }) => {
    const res = await api.post('/products', data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateProduct = createAsyncThunk(
  'product/update',
  async ({ id, data }, { rejectWithValue }) => {
    const res = await api.patch(`/products/${id}`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const updateProductStock = createAsyncThunk(
  'product/updateStock',
  async ({ productId, data }, { rejectWithValue }) => {
    const res = await api.patch(`/products/${productId}/stock`, data)
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

export const copyProductToMarts = createAsyncThunk(
  'product/copyToMarts',
  async ({ productId, martIds }, { rejectWithValue }) => {
    const res = await api.post(`/products/${productId}/copy`, { martIds })
    if (!res.success) return rejectWithValue(res.message)
    return res.data
  }
)

const productSlice = createSlice({
  name: 'product',
  initialState: {
    list:       [],
    pagination: null,
    loading:    false,
    error:      null,
    bulkStatus: null, // { total, done, success, failed }
  },
  reducers: {
    clearProductError: (state) => { state.error = null },
    setBulkStatus: (state, action) => { state.bulkStatus = action.payload },
    clearBulkStatus: (state) => { state.bulkStatus = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending,   (state) => { state.loading = true; state.error = null })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading    = false
        state.list       = action.payload?.products || []
        state.pagination = action.payload?.pagination || null
      })
      .addCase(fetchProducts.rejected,  (state, action) => { state.loading = false; state.error = action.payload })

    builder
      .addCase(createProduct.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
      })

    builder
      .addCase(updateProduct.fulfilled, (state, action) => {
        const idx = state.list.findIndex(p => (p._id || p.id) === (action.payload._id || action.payload.id))
        if (idx !== -1) state.list[idx] = action.payload
      })
  },
})

export const selectAllProducts   = (state) => state.product.list
export const selectProductLoading = (state) => state.product.loading
export const selectProductError   = (state) => state.product.error
export const selectBulkStatus     = (state) => state.product.bulkStatus
export const selectPagination     = (state) => state.product.pagination

export const { clearProductError, setBulkStatus, clearBulkStatus } = productSlice.actions
export default productSlice.reducer