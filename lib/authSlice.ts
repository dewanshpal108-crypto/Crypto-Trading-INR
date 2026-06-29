import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  user: { id: string; username: string; email: string } | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<{ id: string; username: string; email: string }>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setAuthUser, logout } = authSlice.actions
export default authSlice.reducer