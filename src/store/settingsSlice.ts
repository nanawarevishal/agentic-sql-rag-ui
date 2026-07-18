import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// The optional query-time gates the backend guards behind flags (see
// QueryRequest in app/api/routers/query.py). The first three are extra LLM
// round-trips, so the caller opts in explicitly rather than paying for them
// by default. The last two are safety rails the backend already defaults on
// - they're exposed here so a user can opt *out* (e.g. to debug a question
// wrongly rejected as out-of-scope), not to opt in.
export interface SettingsState {
  enableDecomposition: boolean;
  enableCragGrading: boolean;
  enableSelfRagCritique: boolean;
  enableOutOfScopeFilter: boolean;
  enableStaticSqlValidation: boolean;
}

const initialState: SettingsState = {
  enableDecomposition: false,
  enableCragGrading: false,
  enableSelfRagCritique: false,
  enableOutOfScopeFilter: true,
  enableStaticSqlValidation: true,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    toggle(state, action: PayloadAction<keyof SettingsState>) {
      state[action.payload] = !state[action.payload];
    },
  },
});

export const { toggle } = settingsSlice.actions;
export default settingsSlice.reducer;
