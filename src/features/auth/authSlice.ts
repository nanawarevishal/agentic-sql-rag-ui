import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

// "idle" = bootstrap (App.tsx's silent POST /auth/refresh on mount) hasn't
// resolved yet - ProtectedRoute treats it the same as "authenticating" and
// shows a loading state rather than bouncing straight to /login.
export type AuthStatus = "idle" | "authenticating" | "authenticated" | "unauthenticated";

export interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  status: "idle",
};

export interface SessionPayload {
  access_token: string;
  user: AuthUser;
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authenticating(state) {
      state.status = "authenticating";
    },
    setCredentials(state, action: PayloadAction<SessionPayload>) {
      state.accessToken = action.payload.access_token;
      state.user = action.payload.user;
      state.status = "authenticated";
    },
    clearCredentials(state) {
      state.accessToken = null;
      state.user = null;
      state.status = "unauthenticated";
    },
  },
});

export const { authenticating, setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
