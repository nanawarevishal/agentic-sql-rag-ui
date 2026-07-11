import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// The three optional LLM-judgment gates the backend guards behind flags
// (see QueryRequest in app/api/routers/query.py) - each one is an extra
// LLM round-trip, so the caller opts in explicitly rather than paying for
// them by default.
export interface SettingsState {
  enableDecomposition: boolean;
  enableCragGrading: boolean;
  enableSelfRagCritique: boolean;
}

const initialState: SettingsState = {
  enableDecomposition: false,
  enableCragGrading: false,
  enableSelfRagCritique: false,
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
