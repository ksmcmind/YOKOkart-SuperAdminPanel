/**
 * src/store/slices/bannerSlice.js
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const BASE = (martId) => `/api/admin/marts/${martId}/banners`;

// ─── ASYNC THUNKS ─────────────────────────────────────────────

export const fetchBanners = createAsyncThunk(
    "banners/fetchAll",
    async (martId, { rejectWithValue }) => {
        try {
            const res = await fetch(BASE(martId), { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            const json = await res.json();
            if (!res.ok) return rejectWithValue(json.message || "Failed to fetch");
            return json.data;
        } catch (e) { return rejectWithValue(e.message); }
    }
);

export const createBanner = createAsyncThunk(
    "banners/create",
    async ({ martId, data }, { rejectWithValue }) => {
        try {
            const res = await fetch(BASE(martId), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) return rejectWithValue(json.message || "Failed to create");
            return json.data;
        } catch (e) { return rejectWithValue(e.message); }
    }
);

export const updateBanner = createAsyncThunk(
    "banners/update",
    async ({ martId, bannerId, data }, { rejectWithValue }) => {
        try {
            const res = await fetch(`${BASE(martId)}/${bannerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) return rejectWithValue(json.message || "Failed to update");
            return json.data;
        } catch (e) { return rejectWithValue(e.message); }
    }
);

export const toggleBanner = createAsyncThunk(
    "banners/toggle",
    async ({ martId, bannerId, isActive }, { rejectWithValue }) => {
        try {
            const res = await fetch(`${BASE(martId)}/${bannerId}/toggle`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ is_active: isActive }),
            });
            const json = await res.json();
            if (!res.ok) return rejectWithValue(json.message || "Failed to toggle");
            return json.data;
        } catch (e) { return rejectWithValue(e.message); }
    }
);

export const deleteBanner = createAsyncThunk(
    "banners/delete",
    async ({ martId, bannerId }, { rejectWithValue }) => {
        try {
            const res = await fetch(`${BASE(martId)}/${bannerId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const json = await res.json();
            if (!res.ok) return rejectWithValue(json.message || "Failed to delete");
            return bannerId;
        } catch (e) { return rejectWithValue(e.message); }
    }
);

// ─── SLICE ────────────────────────────────────────────────────

const bannersSlice = createSlice({
    name: "banners",
    initialState: {
        items: [],
        loading: false,
        saving: false,
        error: null,
    },
    reducers: {
        clearError: (state) => { state.error = null; },
    },
    extraReducers: (builder) => {
        builder
            // fetch
            .addCase(fetchBanners.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(fetchBanners.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
            .addCase(fetchBanners.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
            // create
            .addCase(createBanner.pending, (s) => { s.saving = true; s.error = null; })
            .addCase(createBanner.fulfilled, (s, a) => { s.saving = false; s.items.unshift(a.payload); })
            .addCase(createBanner.rejected, (s, a) => { s.saving = false; s.error = a.payload; })
            // update
            .addCase(updateBanner.pending, (s) => { s.saving = true; s.error = null; })
            .addCase(updateBanner.fulfilled, (s, a) => { s.saving = false; s.items = s.items.map(b => b.id === a.payload.id ? a.payload : b); })
            .addCase(updateBanner.rejected, (s, a) => { s.saving = false; s.error = a.payload; })
            // toggle
            .addCase(toggleBanner.fulfilled, (s, a) => { s.items = s.items.map(b => b.id === a.payload.id ? a.payload : b); })
            .addCase(toggleBanner.rejected, (s, a) => { s.error = a.payload; })
            // delete
            .addCase(deleteBanner.fulfilled, (s, a) => { s.items = s.items.filter(b => b.id !== a.payload); })
            .addCase(deleteBanner.rejected, (s, a) => { s.error = a.payload; });
    },
});

export const { clearError } = bannersSlice.actions;

// ─── SELECTORS ────────────────────────────────────────────────

export const selectAllBanners = (state) => state.banners?.items;
export const selectBannerById = (id) => (state) => state.banners?.items.find(b => b.id === id);
export const selectLoading = (state) => state.banners?.loading;
export const selectSaving = (state) => state.banners?.saving;
export const selectError = (state) => state.banners?.error;

export default bannersSlice.reducer;