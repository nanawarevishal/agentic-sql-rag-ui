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
  // Retrieval shape, document projects only. These two default ON to match
  // the doc service's own defaults, and are only sent when the user moves
  // them off that default - otherwise the UI would silently override a
  // deployment that configured them differently.
  enableHybridSearch: boolean;
  enableReranking: boolean;
}

const initialState: SettingsState = {
  enableDecomposition: false,
  enableCragGrading: false,
  enableSelfRagCritique: false,
  enableOutOfScopeFilter: true,
  enableStaticSqlValidation: true,
  enableHybridSearch: true,
  enableReranking: true,
};

// Exported so callers can tell "the user chose this" from "this is just the
// default" - see ChatPage, which only forwards deviations.
export const DEFAULT_SETTINGS: SettingsState = initialState;

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
