/**
 * store/slices/agentSlice.js
 * Manages mandal agents, village sub-agents, and commissions.
 * All agent data is stored in PostgreSQL; we track Mongo IDs as refs.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/index'

// ═══════════════════════════════════════════════════════════════════════════════
// MANDAL AGENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchMandalAgent = createAsyncThunk(
    'agents/fetchMandalAgent',
    async (mandalId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/agents/mandal/${mandalId}`);
            return { mandalId, agent: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const addMandalAgent = createAsyncThunk(
    'agents/addMandalAgent',
    async ({ mandalId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/agents/mandal/${mandalId}`, payload);
            return { mandalId, agent: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const updateMandalAgent = createAsyncThunk(
    'agents/updateMandalAgent',
    async ({ mandalId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/agents/mandal/${mandalId}`, payload);
            return { mandalId, agent: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const deleteMandalAgent = createAsyncThunk(
    'agents/deleteMandalAgent',
    async (mandalId, { rejectWithValue }) => {
        try {
            await api.delete(`/agents/mandal/${mandalId}`);
            return { mandalId };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-AGENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchVillageSubAgents = createAsyncThunk(
    'agents/fetchVillageSubAgents',
    async (villageId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/agents/village/${villageId}/subagents`);
            return { villageId, agents: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const fetchSubAgentsByMandal = createAsyncThunk(
    'agents/fetchSubAgentsByMandal',
    async (mandalId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/agents/mandal/${mandalId}/subagents`);
            return { mandalId, agents: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const addSubAgent = createAsyncThunk(
    'agents/addSubAgent',
    async ({ villageId, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/agents/village/${villageId}/subagents`, payload);
            return { villageId, agent: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const updateSubAgent = createAsyncThunk(
    'agents/updateSubAgent',
    async ({ villageId, agentCode, payload }, { rejectWithValue }) => {
        try {
            const { data } = await api.put(`/agents/village/${villageId}/subagents/${agentCode}`, payload);
            return { villageId, agent: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const deleteSubAgent = createAsyncThunk(
    'agents/deleteSubAgent',
    async ({ villageId, agentCode }, { rejectWithValue }) => {
        try {
            await api.delete(`/agents/village/${villageId}/subagents/${agentCode}`);
            return { villageId, agentCode };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchCommissions = createAsyncThunk(
    'agents/fetchCommissions',
    async (agentId, { rejectWithValue }) => {
        try {
            const { data } = await api.get(`/agents/${agentId}/commissions`);
            return { agentId, commissions: data.data };
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const addCommission = createAsyncThunk(
    'agents/addCommission',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/agents/commission', payload);
            return data.data;
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

export const payCommission = createAsyncThunk(
    'agents/payCommission',
    async (commissionId, { rejectWithValue }) => {
        try {
            const { data } = await api.patch(`/agents/commission/${commissionId}/pay`);
            return data.data;
        } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
    }
);

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
    // mandalAgents: { [mandalId]: agent | null }
    mandalAgents: {},

    // subAgents: { [villageId]: agent[] }
    subAgents: {},

    // commissions: { [agentId]: commission[] }
    commissions: {},

    loading: {
        mandalAgent: false,
        subAgents: false,
        save: false,
        commission: false,
    },
    error: null,
    saveSuccess: false,
};

// ── Slice ─────────────────────────────────────────────────────────────────────
const agentSlice = createSlice({
    name: 'agents',
    initialState,
    reducers: {
        clearAgentError(state) { state.error = null; },
        clearSaveSuccess(state) { state.saveSuccess = false; },
    },
    extraReducers: (builder) => {
        builder
            // ── Mandal agent ──────────────────────────────────────────────────────
            .addCase(fetchMandalAgent.pending, (s) => { s.loading.mandalAgent = true; })
            .addCase(fetchMandalAgent.fulfilled, (s, { payload }) => {
                s.loading.mandalAgent = false;
                s.mandalAgents[payload.mandalId] = payload.agent;
            })
            .addCase(fetchMandalAgent.rejected, (s, { payload }) => { s.loading.mandalAgent = false; s.error = payload; })

            .addCase(addMandalAgent.pending, (s) => { s.loading.save = true; s.saveSuccess = false; })
            .addCase(addMandalAgent.fulfilled, (s, { payload }) => {
                s.loading.save = false; s.saveSuccess = true;
                s.mandalAgents[payload.mandalId] = payload.agent;
            })
            .addCase(addMandalAgent.rejected, (s, { payload }) => { s.loading.save = false; s.error = payload; })

            .addCase(updateMandalAgent.pending, (s) => { s.loading.save = true; s.saveSuccess = false; })
            .addCase(updateMandalAgent.fulfilled, (s, { payload }) => {
                s.loading.save = false; s.saveSuccess = true;
                s.mandalAgents[payload.mandalId] = payload.agent;
            })
            .addCase(updateMandalAgent.rejected, (s, { payload }) => { s.loading.save = false; s.error = payload; })

            .addCase(deleteMandalAgent.fulfilled, (s, { payload }) => {
                s.mandalAgents[payload.mandalId] = null;
            })

            // ── Sub-agents ────────────────────────────────────────────────────────
            .addCase(fetchVillageSubAgents.pending, (s) => { s.loading.subAgents = true; })
            .addCase(fetchVillageSubAgents.fulfilled, (s, { payload }) => {
                s.loading.subAgents = false;
                s.subAgents[payload.villageId] = payload.agents;
            })
            .addCase(fetchVillageSubAgents.rejected, (s, { payload }) => { s.loading.subAgents = false; s.error = payload; })

            .addCase(fetchSubAgentsByMandal.fulfilled, (s, { payload }) => {
                // Flatten into subAgents keyed by any available village reference
                // Store under mandal key for convenience
                s.subAgents[`mandal_${payload.mandalId}`] = payload.agents;
            })

            .addCase(addSubAgent.pending, (s) => { s.loading.save = true; s.saveSuccess = false; })
            .addCase(addSubAgent.fulfilled, (s, { payload }) => {
                s.loading.save = false; s.saveSuccess = true;
                const list = s.subAgents[payload.villageId] || [];
                s.subAgents[payload.villageId] = [...list, payload.agent];
            })
            .addCase(addSubAgent.rejected, (s, { payload }) => { s.loading.save = false; s.error = payload; })

            .addCase(updateSubAgent.pending, (s) => { s.loading.save = true; s.saveSuccess = false; })
            .addCase(updateSubAgent.fulfilled, (s, { payload }) => {
                s.loading.save = false; s.saveSuccess = true;
                const list = s.subAgents[payload.villageId] || [];
                s.subAgents[payload.villageId] = list.map(a =>
                    a.agent_code === payload.agent.agent_code ? payload.agent : a
                );
            })
            .addCase(updateSubAgent.rejected, (s, { payload }) => { s.loading.save = false; s.error = payload; })

            .addCase(deleteSubAgent.fulfilled, (s, { payload }) => {
                const list = s.subAgents[payload.villageId] || [];
                s.subAgents[payload.villageId] = list.filter(a => a.agent_code !== payload.agentCode);
            })

            // ── Commissions ───────────────────────────────────────────────────────
            .addCase(fetchCommissions.pending, (s) => { s.loading.commission = true; })
            .addCase(fetchCommissions.fulfilled, (s, { payload }) => {
                s.loading.commission = false;
                s.commissions[payload.agentId] = payload.commissions;
            })
            .addCase(fetchCommissions.rejected, (s, { payload }) => { s.loading.commission = false; s.error = payload; })

            .addCase(addCommission.fulfilled, (s, { payload }) => {
                const list = s.commissions[payload.agent_id] || [];
                s.commissions[payload.agent_id] = [payload, ...list];
            })

            .addCase(payCommission.fulfilled, (s, { payload }) => {
                const list = s.commissions[payload.agent_id] || [];
                s.commissions[payload.agent_id] = list.map(c =>
                    c.id === payload.id ? payload : c
                );
            });
    },
});

export const { clearAgentError, clearSaveSuccess } = agentSlice.actions;
export default agentSlice.reducer;