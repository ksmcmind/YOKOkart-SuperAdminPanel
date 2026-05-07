// src/store/slices/salesSlice.js
//
// Cache strategy — mirrors invetoryslice.js patterns.
//
// CACHE KEY: `${martId}__${fromDate}__${toDate}`
//
// Each thunk checks the cache before hitting the API:
//   - fetchSalesSummary   → cached in summaryCache[key]
//   - fetchSalesByProduct → cached in productsCache[key__page__search]
//   - fetchProductTrend   → cached in trendCache[martId__productId__from__to]
//
// Tab change = same mart+dates = cache hit = zero API calls.
// New mart or new date range = cache miss = fresh fetch.
// Cache cleared when martId changes (via clearCacheForMart).

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/index'

// ── Cache key builders ────────────────────────────────────────
const summaryKey = (martId, from, to) => `${martId}__${from}__${to}`
const productsKey = (martId, from, to, page, search) => `${martId}__${from}__${to}__p${page}__${search || ''}`
const trendKey = (martId, productId, from, to) => `${martId}__${productId}__${from}__${to}`

// ── Thunks ────────────────────────────────────────────────────

export const fetchSalesSummary = createAsyncThunk(
    'sales/fetchSummary',
    async ({ martId, fromDate, toDate }, { getState, rejectWithValue }) => {
        const key = summaryKey(martId, fromDate, toDate)
        // Cache hit — return existing data, skip API
        const cached = getState().sales.summaryCache[key]
        if (cached) return { data: cached, key, fromCache: true }

        try {
            const res = await api.get(
                `/reports/product-sales/summary?martId=${martId}&fromDate=${fromDate}&toDate=${toDate}`
            )
            return { data: res.data.summary, key, fromCache: false }
        } catch (err) {
            return rejectWithValue(err?.response?.data?.message || err.message || 'Failed to fetch summary')
        }
    }
)

export const fetchSalesByProduct = createAsyncThunk(
    'sales/fetchByProduct',
    async ({ martId, fromDate, toDate, search = '', page = 1, limit = 50 }, { getState, rejectWithValue }) => {
        const key = productsKey(martId, fromDate, toDate, page, search)
        // Cache hit
        const cached = getState().sales.productsCache[key]
        if (cached) return { ...cached, key, fromCache: true }

        try {
            const params = new URLSearchParams({
                martId, fromDate, toDate, page, limit,
                ...(search ? { search } : {}),
            })
            const res = await api.get(`/reports/product-sales?${params}`)
            return {
                products: res.data.products,
                pagination: res.data.pagination,
                period: res.data.period,
                key,
                fromCache: false,
            }
        } catch (err) {
            return rejectWithValue(err?.response?.data?.message || err.message || 'Failed to fetch sales')
        }
    }
)

export const fetchProductTrend = createAsyncThunk(
    'sales/fetchTrend',
    async ({ martId, productId, fromDate, toDate }, { getState, rejectWithValue }) => {
        const key = trendKey(martId, productId, fromDate, toDate)
        const cached = getState().sales.trendCache[key]
        if (cached) return { trend: cached, productId, key, fromCache: true }

        try {
            const params = new URLSearchParams({ martId, fromDate, toDate })
            const res = await api.get(`/reports/product-sales/${productId}/trend?${params}`)
            return {
                trend: res.data.trend,
                productId,
                key,
                fromCache: false,
            }
        } catch (err) {
            return rejectWithValue(err?.response?.data?.message || err.message || 'Failed to fetch trend')
        }
    }
)

// ── Slice ─────────────────────────────────────────────────────

const salesSlice = createSlice({
    name: 'sales',
    initialState: {
        // Active display state
        summary: null,
        products: [],
        pagination: null,
        trend: [],
        trendProductId: null,

        // Loading states
        summaryLoading: false,
        productsLoading: false,
        trendLoading: false,

        // Error states
        summaryError: null,
        productsError: null,
        trendError: null,

        // Caches — keyed by cache key strings
        summaryCache: {},   // key → summary object
        productsCache: {},   // key → { products, pagination, period }
        trendCache: {},   // key → trend[]
    },

    reducers: {
        clearTrend(state) {
            state.trend = []
            state.trendProductId = null
            state.trendError = null
        },
        // Call this when user switches mart — wipes all caches for that mart
        clearCacheForMart(state, action) {
            const martId = action.payload
            for (const key of Object.keys(state.summaryCache)) {
                if (key.startsWith(martId)) delete state.summaryCache[key]
            }
            for (const key of Object.keys(state.productsCache)) {
                if (key.startsWith(martId)) delete state.productsCache[key]
            }
            for (const key of Object.keys(state.trendCache)) {
                if (key.startsWith(martId)) delete state.trendCache[key]
            }
            state.summary = null
            state.products = []
            state.pagination = null
            state.trend = []
        },
        // Full wipe (e.g. logout)
        clearAll(state) {
            state.summary = null
            state.products = []
            state.pagination = null
            state.trend = []
            state.trendProductId = null
            state.summaryCache = {}
            state.productsCache = {}
            state.trendCache = {}
            state.summaryError = null
            state.productsError = null
            state.trendError = null
        },
    },

    extraReducers: (builder) => {
        // ── fetchSalesSummary ──────────────────────────────────
        builder
            .addCase(fetchSalesSummary.pending, (state) => {
                state.summaryLoading = true
                state.summaryError = null
            })
            .addCase(fetchSalesSummary.fulfilled, (state, { payload }) => {
                state.summaryLoading = false
                state.summary = payload.data
                // Write to cache only on fresh fetch
                if (!payload.fromCache) {
                    state.summaryCache[payload.key] = payload.data
                }
            })
            .addCase(fetchSalesSummary.rejected, (state, { payload }) => {
                state.summaryLoading = false
                state.summaryError = payload
            })

        // ── fetchSalesByProduct ────────────────────────────────
        builder
            .addCase(fetchSalesByProduct.pending, (state) => {
                state.productsLoading = true
                state.productsError = null
            })
            .addCase(fetchSalesByProduct.fulfilled, (state, { payload }) => {
                state.productsLoading = false
                state.products = payload.products
                state.pagination = payload.pagination
                if (!payload.fromCache) {
                    state.productsCache[payload.key] = {
                        products: payload.products,
                        pagination: payload.pagination,
                        period: payload.period,
                    }
                }
            })
            .addCase(fetchSalesByProduct.rejected, (state, { payload }) => {
                state.productsLoading = false
                state.productsError = payload
            })

        // ── fetchProductTrend ──────────────────────────────────
        builder
            .addCase(fetchProductTrend.pending, (state) => {
                state.trendLoading = true
                state.trendError = null
            })
            .addCase(fetchProductTrend.fulfilled, (state, { payload }) => {
                state.trendLoading = false
                state.trend = payload.trend
                state.trendProductId = payload.productId
                if (!payload.fromCache) {
                    state.trendCache[payload.key] = payload.trend
                }
            })
            .addCase(fetchProductTrend.rejected, (state, { payload }) => {
                state.trendLoading = false
                state.trendError = payload
            })
    },
})

export const { clearTrend, clearCacheForMart, clearAll } = salesSlice.actions

// ── Selectors ─────────────────────────────────────────────────
export const selectSalesSummary = s => s.sales.summary
export const selectSalesSummaryLoading = s => s.sales.summaryLoading
export const selectSalesSummaryError = s => s.sales.summaryError

export const selectSalesProducts = s => s.sales.products
export const selectSalesPagination = s => s.sales.pagination
export const selectSalesProductsLoading = s => s.sales.productsLoading
export const selectSalesProductsError = s => s.sales.productsError

export const selectSalesTrend = s => s.sales.trend
export const selectSalesTrendLoading = s => s.sales.trendLoading
export const selectSalesTrendError = s => s.sales.trendError
export const selectSalesTrendProductId = s => s.sales.trendProductId

// Is a specific summary already cached?
export const selectSummaryIsCached = (martId, from, to) => s =>
    !!s.sales.summaryCache[summaryKey(martId, from, to)]

export const selectProductsAreCached = (martId, from, to, page, search) => s =>
    !!s.sales.productsCache[productsKey(martId, from, to, page, search)]

export default salesSlice.reducer