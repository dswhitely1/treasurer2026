import { configureStore } from '@reduxjs/toolkit'

import counterReducer from './features/counterSlice'
import authReducer from './features/authSlice'
import organizationReducer from './features/organizationSlice'
import accountReducer from './features/accountSlice'
import transactionReducer from './features/transactionSlice'
import statusReducer from './features/statusSlice'
import vendorReducer from './features/vendorSlice'
import categoryReducer from './features/categorySlice'
import { statusApi } from '@/features/status/api'

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    auth: authReducer,
    organization: organizationReducer,
    account: accountReducer,
    transaction: transactionReducer,
    status: statusReducer,
    vendor: vendorReducer,
    category: categoryReducer,
    [statusApi.reducerPath]: statusApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(statusApi.middleware),
  devTools: import.meta.env.DEV,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
