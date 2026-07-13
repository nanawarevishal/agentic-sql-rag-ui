import { api } from "../../api/apiSlice";
import type { AuthUser, SessionPayload } from "./authSlice";

interface SessionResponse extends SessionPayload {
  token_type: string;
}

const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    googleLogin: builder.mutation<SessionResponse, { id_token: string }>({
      query: (body) => ({ url: "/auth/google", method: "POST", body }),
    }),
    refreshSession: builder.mutation<SessionResponse, void>({
      query: () => ({ url: "/auth/refresh", method: "POST" }),
    }),
    logout: builder.mutation<{ status: string }, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    getMe: builder.query<AuthUser, void>({
      query: () => "/auth/me",
    }),
  }),
});

export const {
  useGoogleLoginMutation,
  useRefreshSessionMutation,
  useLogoutMutation,
  useLazyGetMeQuery,
} = authApi;
