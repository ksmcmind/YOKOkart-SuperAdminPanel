// src/store/slices/collectionSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

// ── Thunks ────────────────────────────────────────────────────

export const fetchCollections = createAsyncThunk(
    'collection/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const res = await api.get('/collections/admin')
            return res.data?.data || res.data || []
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message) }
    }
)

export const createCollection = createAsyncThunk(
    'collection/create',
    async (data, { rejectWithValue }) => {
        try {
            const res = await api.post('/collections/admin', data)
            return res.data?.data || res.data
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message) }
    }
)

export const updateCollection = createAsyncThunk(
    'collection/update',
    async ({ slug, data }, { rejectWithValue }) => {
        try {
            const res = await api.put(`/collections/admin/${slug}`, data)
            return res.data?.data || res.data
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message) }
    }
)

export const toggleCollection = createAsyncThunk(
    'collection/toggle',
    async ({ slug, isActive }, { rejectWithValue }) => {
        try {
            const res = await api.patch(`/collections/admin/${slug}/toggle`, { is_active: isActive })
            return res.data?.data || res.data
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message) }
    }
)

export const deleteCollection = createAsyncThunk(
    'collection/delete',
    async (slug, { rejectWithValue }) => {
        try {
            await api.delete(`/collections/admin/${slug}`)
            return slug
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message) }
    }
)

// Bulk: sends array — NOT a file upload
// Each item goes through createCollection individually on backend
export const bulkCreateCollections = createAsyncThunk(
    'collection/bulkCreate',
    async (items, { rejectWithValue }) => {
        try {
            // Send as array — backend handles each item
            const res = await api.post('/collections/admin/bulk', { collections: items })
            return res.data?.data || res.data || []
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message) }
    }
)

// ── Slice ─────────────────────────────────────────────────────

const collectionSlice = createSlice({
    name: 'collection',
    initialState: {
        items: [],
        loading: false,
        saving: false,
        error: null,
    },
    reducers: {
        clearCollectionError: (s) => { s.error = null },
    },
    extraReducers: (b) => {
        b
            // fetch
            .addCase(fetchCollections.pending, (s) => { s.loading = true; s.error = null })
            .addCase(fetchCollections.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
            .addCase(fetchCollections.rejected, (s, a) => { s.loading = false; s.error = a.payload })
            // create
            .addCase(createCollection.pending, (s) => { s.saving = true; s.error = null })
            .addCase(createCollection.fulfilled, (s, a) => { s.saving = false; s.items.unshift(a.payload) })
            .addCase(createCollection.rejected, (s, a) => { s.saving = false; s.error = a.payload })
            // update
            .addCase(updateCollection.pending, (s) => { s.saving = true; s.error = null })
            .addCase(updateCollection.fulfilled, (s, a) => {
                s.saving = false
                s.items = s.items.map(c => c.slug === a.payload.slug ? a.payload : c)
            })
            .addCase(updateCollection.rejected, (s, a) => { s.saving = false; s.error = a.payload })
            // toggle
            .addCase(toggleCollection.fulfilled, (s, a) => {
                s.items = s.items.map(c => c.slug === a.payload.slug ? a.payload : c)
            })
            .addCase(toggleCollection.rejected, (s, a) => { s.error = a.payload })
            // delete
            .addCase(deleteCollection.fulfilled, (s, a) => {
                s.items = s.items.filter(c => c.slug !== a.payload)
            })
            .addCase(deleteCollection.rejected, (s, a) => { s.error = a.payload })
            // bulk
            .addCase(bulkCreateCollections.pending, (s) => { s.saving = true; s.error = null })
            .addCase(bulkCreateCollections.fulfilled, (s, a) => {
                s.saving = false
                s.items = [...(a.payload || []), ...s.items]
            })
            .addCase(bulkCreateCollections.rejected, (s, a) => { s.saving = false; s.error = a.payload })
    },
})

export const { clearCollectionError } = collectionSlice.actions

// ── Selectors ─────────────────────────────────────────────────
export const selectAllCollections = (s) => s.collection.items
export const selectCollectionLoading = (s) => s.collection.loading
export const selectCollectionSaving = (s) => s.collection.saving
export const selectCollectionError = (s) => s.collection.error

export default collectionSlice.reducer