/**
 * store/slices/geoSlice.js
 * Manages Nation → State → District → Mandal → Village dropdown chains
 * and geo CRUD operations.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/index'

// ── Async Thunks ──────────────────────────────────────────────────────────────

export const fetchNations = createAsyncThunk('geo/fetchNations', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/geo/nations');
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchStates = createAsyncThunk('geo/fetchStates', async (nationId, { rejectWithValue }) => {
    try {
        const url = nationId ? `/geo/states/nation/${nationId}` : '/geo/states';
        const { data } = await api.get(url);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchDistricts = createAsyncThunk('geo/fetchDistricts', async (stateId, { rejectWithValue }) => {
    try {
        const url = stateId ? `/geo/districts/state/${stateId}` : '/geo/districts';
        const { data } = await api.get(url);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchMandals = createAsyncThunk('geo/fetchMandals', async (districtId, { rejectWithValue }) => {
    try {
        const url = districtId ? `/geo/mandals/district/${districtId}` : '/geo/mandals';
        const { data } = await api.get(url);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const fetchVillages = createAsyncThunk('geo/fetchVillages', async (mandalId, { rejectWithValue }) => {
    try {
        const url = mandalId ? `/geo/villages/mandal/${mandalId}` : '/geo/villages';
        const { data } = await api.get(url);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const createNation = createAsyncThunk('geo/createNation', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/geo/nations', payload);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const createState = createAsyncThunk('geo/createState', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/geo/states', payload);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const createDistrict = createAsyncThunk('geo/createDistrict', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/geo/districts', payload);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const createMandal = createAsyncThunk('geo/createMandal', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/geo/mandals', payload);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const createVillage = createAsyncThunk('geo/createVillage', async (payload, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/geo/villages', payload);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

export const updateVillage = createAsyncThunk('geo/updateVillage', async ({ id, ...payload }, { rejectWithValue }) => {
    try {
        const { data } = await api.put(`/geo/villages/${id}`, payload);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

// Geo bulk upload
export const uploadGeoCSV = createAsyncThunk('geo/uploadGeoCSV', async (formData, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/geo/bulk/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    } catch (e) { return rejectWithValue(e.response?.data || { message: e.message }); }
});

export const pollGeoJobStatus = createAsyncThunk('geo/pollGeoJobStatus', async (jobId, { rejectWithValue }) => {
    try {
        const { data } = await api.get(`/geo/bulk/status/${jobId}`);
        return data.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
});

// ── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
    nations: [],
    states: [],
    districts: [],
    mandals: [],
    villages: [],

    // Selection (for cascading dropdowns)
    selectedNationId: null,
    selectedStateId: null,
    selectedDistrictId: null,
    selectedMandalId: null,

    loading: {
        nations: false, states: false, districts: false,
        mandals: false, villages: false, upload: false,
    },
    error: null,

    // Bulk upload
    uploadJob: null,    // { jobId, status, processedRows, totalRows, ... }
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const geoSlice = createSlice({
    name: 'geo',
    initialState,
    reducers: {
        selectNation(state, { payload }) {
            state.selectedNationId = payload;
            state.selectedStateId = null;
            state.selectedDistrictId = null;
            state.selectedMandalId = null;
            state.states = [];
            state.districts = [];
            state.mandals = [];
            state.villages = [];
        },
        selectState(state, { payload }) {
            state.selectedStateId = payload;
            state.selectedDistrictId = null;
            state.selectedMandalId = null;
            state.districts = [];
            state.mandals = [];
            state.villages = [];
        },
        selectDistrict(state, { payload }) {
            state.selectedDistrictId = payload;
            state.selectedMandalId = null;
            state.mandals = [];
            state.villages = [];
        },
        selectMandal(state, { payload }) {
            state.selectedMandalId = payload;
            state.villages = [];
        },
        clearUploadJob(state) {
            state.uploadJob = null;
        },
        clearError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // ── Nations ────────────────────────────────────────────────────────────
        builder
            .addCase(fetchNations.pending, (s) => { s.loading.nations = true; })
            .addCase(fetchNations.fulfilled, (s, { payload }) => { s.loading.nations = false; s.nations = payload || []; })
            .addCase(fetchNations.rejected, (s, { payload }) => { s.loading.nations = false; s.error = payload; })

            // ── States ────────────────────────────────────────────────────────────
            .addCase(fetchStates.pending, (s) => { s.loading.states = true; })
            .addCase(fetchStates.fulfilled, (s, { payload }) => { s.loading.states = false; s.states = payload || []; })
            .addCase(fetchStates.rejected, (s, { payload }) => { s.loading.states = false; s.error = payload; })

            // ── Districts ─────────────────────────────────────────────────────────
            .addCase(fetchDistricts.pending, (s) => { s.loading.districts = true; })
            .addCase(fetchDistricts.fulfilled, (s, { payload }) => { s.loading.districts = false; s.districts = payload || []; })
            .addCase(fetchDistricts.rejected, (s, { payload }) => { s.loading.districts = false; s.error = payload; })

            // ── Mandals ───────────────────────────────────────────────────────────
            .addCase(fetchMandals.pending, (s) => { s.loading.mandals = true; })
            .addCase(fetchMandals.fulfilled, (s, { payload }) => { s.loading.mandals = false; s.mandals = payload || []; })
            .addCase(fetchMandals.rejected, (s, { payload }) => { s.loading.mandals = false; s.error = payload; })

            // ── Villages ──────────────────────────────────────────────────────────
            .addCase(fetchVillages.pending, (s) => { s.loading.villages = true; })
            .addCase(fetchVillages.fulfilled, (s, { payload }) => { s.loading.villages = false; s.villages = payload || []; })
            .addCase(fetchVillages.rejected, (s, { payload }) => { s.loading.villages = false; s.error = payload; })

            // ── Create ops: prepend to list ───────────────────────────────────────
            .addCase(createNation.fulfilled, (s, { payload }) => { s.nations = [payload, ...s.nations]; })
            .addCase(createState.fulfilled, (s, { payload }) => { s.states = [payload, ...s.states]; })
            .addCase(createDistrict.fulfilled, (s, { payload }) => { s.districts = [payload, ...s.districts]; })
            .addCase(createMandal.fulfilled, (s, { payload }) => { s.mandals = [payload, ...s.mandals]; })
            .addCase(createVillage.fulfilled, (s, { payload }) => { s.villages = [payload, ...s.villages]; })
            .addCase(updateVillage.fulfilled, (s, { payload }) => {
                const idx = s.villages.findIndex(v => v._id === payload._id);
                if (idx >= 0) s.villages[idx] = payload;
            })

            // ── Bulk upload ───────────────────────────────────────────────────────
            .addCase(uploadGeoCSV.pending, (s) => { s.loading.upload = true; s.uploadJob = null; })
            .addCase(uploadGeoCSV.fulfilled, (s, { payload }) => {
                s.loading.upload = false;
                s.uploadJob = { jobId: payload.jobId, status: 'queued', totalRows: payload.totalRows };
            })
            .addCase(uploadGeoCSV.rejected, (s, { payload }) => {
                s.loading.upload = false;
                s.error = payload?.message || 'Upload failed';
            })
            .addCase(pollGeoJobStatus.fulfilled, (s, { payload }) => {
                if (s.uploadJob) s.uploadJob = { ...s.uploadJob, ...payload };
            });
    },
});

export const {
    selectNation, selectState, selectDistrict, selectMandal,
    clearUploadJob, clearError,
} = geoSlice.actions;

export default geoSlice.reducer;