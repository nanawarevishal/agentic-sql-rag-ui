import { configureStore } from "@reduxjs/toolkit";
import { api } from "../api/apiSlice";
import authReducer from "../features/auth/authSlice";
import settingsReducer from "./settingsSlice";

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
