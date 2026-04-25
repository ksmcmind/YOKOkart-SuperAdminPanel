// src/store/slices/inventorySlice.js
//
// Centralized inventory state. Used by two pages:
//   - MartAdmin: /inventory (full CRUD — mart-scoped)
//   - SuperAdmin: /admin/inventory (read-only dashboard across all marts)
//
// Register in your store:
//   import inventoryReducer from './slices/inventorySlice'
//   reducer: { inventory: inventoryReducer, ... }

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import api from '../../api/index'
import { showToast } from './uiSlice'

// ── Thunks ────────────────────────────────────────────────────────────────────

// Full list — used by mart admin's inventory page
export const fetchInventory = createAsyncThunk(
    'inventory/fetchAll',
    async (martId, { rejectWithValue }) => {
        if (!martId) return rejectWithValue('No martId provided')
        try {
            const res = await api.get(`/inventory?martId=${encodeURIComponent(martId)}`)
            if (!res.success) return rejectWithValue(res.message || 'Failed to load inventory')
            return res.data || []
        } catch (err) {
            return rejectWithValue(err?.message || 'Network error')
        }
    }
)

// Dashboard stats — used by super admin's read-only page
// Hits the getDashboard() query in your backend (inventory.queries.js)
export const fetchInventoryDashboard = createAsyncThunk(
    'inventory/fetchDashboard',
    async (martId, { rejectWithValue }) => {
        if (!martId) return rejectWithValue('No martId provided')
        try {
            const res = await api.get(`/inventory/dashboard?martId=${encodeURIComponent(martId)}`)
            if (!res.success) return rejectWithValue(res.message || 'Failed to load dashboard')
            return res.data || {
                total_items:         0,
                out_of_stock_count:  0,
                low_stock_count:     0,
                out_of_stock_items:  [],
                low_stock_items:     [],
            }
        } catch (err) {
            return rejectWithValue(err?.message || 'Network error')
        }
    }
)

export const addInventoryItem = createAsyncThunk(
    'inventory/add',
    async (payload, { dispatch, rejectWithValue }) => {
        try {
            const res = await api.post('/inventory', payload)
            if (!res.success) {
                dispatch(showToast({ message: res.message || 'Failed to add', type: 'error' }))
                return rejectWithValue(res.message)
            }
            dispatch(showToast({ message: 'Item added!', type: 'success' }))
            return res.data
        } catch (err) {
            dispatch(showToast({ message: 'Network error', type: 'error' }))
            return rejectWithValue(err?.message)
        }
    }
)

export const updateInventoryItem = createAsyncThunk(
    'inventory/update',
    async ({ id, patch, silent = false }, { dispatch, rejectWithValue }) => {
        try {
            const res = await api.patch(`/inventory/${id}`, patch)
            if (!res.success) {
                dispatch(showToast({ message: res.message || 'Update failed', type: 'error' }))
                return rejectWithValue(res.message)
            }
            if (!silent) dispatch(showToast({ message: 'Updated', type: 'success' }))
            return { id, patch, server: res.data }
        } catch (err) {
            dispatch(showToast({ message: 'Update failed', type: 'error' }))
            return rejectWithValue(err?.message)
        }
    }
)

export const toggleInventoryActive = createAsyncThunk(
    'inventory/toggleActive',
    async (item, { dispatch, rejectWithValue }) => {
        try {
            const res = await api.patch(`/inventory/${item.id}`, { is_active: !item.is_active })
            if (!res.success) {
                dispatch(showToast({ message: 'Toggle failed', type: 'error' }))
                return rejectWithValue(res.message)
            }
            return { id: item.id, is_active: !item.is_active }
        } catch (err) {
            dispatch(showToast({ message: 'Toggle failed', type: 'error' }))
            return rejectWithValue(err?.message)
        }
    }
)

export const reorderInventory = createAsyncThunk(
    'inventory/reorder',
    async (orderedIds, { rejectWithValue }) => {
        try {
            const res = await api.patch('/inventory/reorder', { ids: orderedIds })
            if (!res.success) return rejectWithValue(res.message)
            return orderedIds
        } catch (err) {
            return rejectWithValue(err?.message)
        }
    }
)

export const bulkUploadInventory = createAsyncThunk(
    'inventory/bulkUpload',
    async (items, { dispatch, rejectWithValue }) => {
        try {
            const res = await api.post('/inventory/bulk', { items })
            if (!res.success) {
                dispatch(showToast({ message: res.message || 'Bulk upload failed', type: 'error' }))
                return rejectWithValue(res.message || 'Bulk upload failed')
            }
            return res.data || { created: items.length, errors: [] }
        } catch (err) {
            dispatch(showToast({ message: 'Upload failed. Check connection.', type: 'error' }))
            return rejectWithValue(err?.message || 'Network error')
        }
    }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState = {
    items:                [],
    loading:              false,
    error:                null,
    lastFetchedMartId:    null,
    lastFetchedAt:        null,
    saving:               false,
    bulkUploading:        false,

    // Super admin dashboard state — separate from `items` so the two pages don't step on each other
    dashboard:            null,
    dashboardLoading:     false,
    dashboardError:       null,
    dashboardForMartId:   null,
}

const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        reorderLocal: (state, action) => { state.items = action.payload },
        clearInventory: (state) => {
            state.items = []
            state.lastFetchedMartId = null
            state.lastFetchedAt = null
        },
        clearDashboard: (state) => {
            state.dashboard = null
            state.dashboardForMartId = null
        },
    },
    extraReducers: (builder) => {
        builder
            // fetch full list
            .addCase(fetchInventory.pending, (state) => {
                state.loading = true; state.error = null
            })
            .addCase(fetchInventory.fulfilled, (state, action) => {
                state.loading = false
                state.items = action.payload
                state.lastFetchedMartId = action.meta.arg
                state.lastFetchedAt = Date.now()
            })
            .addCase(fetchInventory.rejected, (state, action) => {
                state.loading = false; state.error = action.payload
            })

            // fetch dashboard
            .addCase(fetchInventoryDashboard.pending, (state) => {
                state.dashboardLoading = true; state.dashboardError = null
            })
            .addCase(fetchInventoryDashboard.fulfilled, (state, action) => {
                state.dashboardLoading = false
                state.dashboard = action.payload
                state.dashboardForMartId = action.meta.arg
            })
            .addCase(fetchInventoryDashboard.rejected, (state, action) => {
                state.dashboardLoading = false
                state.dashboardError = action.payload
                state.dashboard = null
            })

            // add
            .addCase(addInventoryItem.pending, (state) => { state.saving = true })
            .addCase(addInventoryItem.fulfilled, (state, action) => {
                state.saving = false
                if (action.payload) state.items.unshift(action.payload)
            })
            .addCase(addInventoryItem.rejected, (state) => { state.saving = false })

            // update
            .addCase(updateInventoryItem.fulfilled, (state, action) => {
                const { id, patch, server } = action.payload
                const idx = state.items.findIndex(i => i.id === id)
                if (idx !== -1) {
                    state.items[idx] = { ...state.items[idx], ...patch, ...(server || {}) }
                }
            })

            // toggle
            .addCase(toggleInventoryActive.fulfilled, (state, action) => {
                const { id, is_active } = action.payload
                const idx = state.items.findIndex(i => i.id === id)
                if (idx !== -1) state.items[idx].is_active = is_active
            })

            // reorder
            .addCase(reorderInventory.rejected, (state) => {
                state.error = 'Reorder sync failed'
            })

            // bulk
            .addCase(bulkUploadInventory.pending,   (state) => { state.bulkUploading = true })
            .addCase(bulkUploadInventory.fulfilled, (state) => { state.bulkUploading = false })
            .addCase(bulkUploadInventory.rejected,  (state) => { state.bulkUploading = false })
    },
})

export const { reorderLocal, clearInventory, clearDashboard } = inventorySlice.actions
export default inventorySlice.reducer

// ── Selectors ─────────────────────────────────────────────────────────────────

const selectInventoryState = (state) => state.inventory || initialState

export const selectInventoryItems          = (state) => selectInventoryState(state).items
export const selectInventoryLoading        = (state) => selectInventoryState(state).loading
export const selectInventorySaving         = (state) => selectInventoryState(state).saving
export const selectInventoryBulkUploading  = (state) => selectInventoryState(state).bulkUploading

// Dashboard selectors
export const selectInventoryDashboard         = (state) => selectInventoryState(state).dashboard
export const selectInventoryDashboardLoading  = (state) => selectInventoryState(state).dashboardLoading
export const selectInventoryDashboardError    = (state) => selectInventoryState(state).dashboardError
export const selectInventoryDashboardForMart  = (state) => selectInventoryState(state).dashboardForMartId

// Memoized stats derived from items (mart admin page)
export const selectInventoryStats = createSelector(
    [selectInventoryItems],
    (items) => ({
        total:       items.length,
        outOfStock:  items.filter(i => parseFloat(i.stock_qty) <= 0).length,
        lowStock:    items.filter(i => {
            const qty = parseFloat(i.stock_qty)
            const alert = parseFloat(i.low_stock_alert)
            return qty > 0 && qty <= alert
        }).length,
        active:      items.filter(i => i.is_active).length,
    })
)

// Memoized filtered list (mart admin page)
export const selectFilteredInventory = createSelector(
    [selectInventoryItems, (_state, search) => search],
    (items, search) => {
        if (!search) return items
        const q = search.toLowerCase()
        return items.filter(it =>
            it.mongo_product_id?.toLowerCase().includes(q) ||
            it.variant_id?.toLowerCase().includes(q) ||
            it.aisle_location?.toLowerCase().includes(q)
        )
    }
)