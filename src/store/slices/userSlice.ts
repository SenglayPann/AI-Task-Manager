import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IUserProfile } from '../../types/userProfile';

interface UserState {
  profile: IUserProfile | null;
  hasCompletedOnboarding: boolean;
}

const initialState: UserState = {
  profile: null,
  hasCompletedOnboarding: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<IUserProfile>) => {
      state.profile = action.payload;
    },
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
    },
    resetOnboarding: (state) => {
      state.profile = null;
      state.hasCompletedOnboarding = false;
    },
  },
});

export const { setProfile, completeOnboarding, resetOnboarding } = userSlice.actions;
export default userSlice.reducer;
