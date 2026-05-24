// src/store/index.js
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import uiReducer from './slices/uiSlice'
import martReducer from './slices/martSlice'
import staffReducer from './slices/staffSlice'
import categoryReducer from './slices/categorySlice'
import productReducer from './slices/productSlice'
import orderReducer from './slices/orderSlice'
import driverReducer from './slices/driverSlice'
import bannerReducer from './slices/Bannerslice'
import inventoryReducer from './slices/invetoryslice'
import salesReducer from './slices/salesslice'
import collectionsReducer from './slices/Collectionslice'
import agentReducer from './slices/Agentslice'
import geoReducer from './slices/Geoslice'
const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    mart: martReducer,
    staff: staffReducer,
    category: categoryReducer,
    product: productReducer,
    order: orderReducer,
    drivers: driverReducer,
    banners: bannerReducer,
    inventory: inventoryReducer,
    sales: salesReducer,
    collection: collectionsReducer,
    geo: geoReducer,
    agents: agentReducer
  },
})

export default store