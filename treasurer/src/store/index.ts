import { configureStore } from '@reduxjs/toolkit'

import counterReducer from './features/counterSlice'
import authReducer from './features/authSlice'
import organizationReducer from './features/organizationSlice'
import accountReducer from './features/accountSlice'

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    auth: authReducer,
    organization: organizationReducer,
    account: accountReducer,
  },
  devTools: import.meta.env.DEV,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
