'use client'
import { useRef, useEffect } from 'react'
import { Provider } from 'react-redux'
import { makeStore, AppStore } from '@/lib/store'
import { setAuthUser, logout } from '@/lib/authSlice'

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) {
    //create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  // Hydration effect: runs once on the client right after browser reload
  // to restore user session from the HTTP-only JWT cookie
  useEffect(() => {
    const hydrateUserSession = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();

        if (data.success && data.user) {
          storeRef?.current?.dispatch(setAuthUser(data.user));
        } else {
          storeRef?.current?.dispatch(logout());
        }
      } catch (error) {
        console.error("Failed to hydrate user session", error);
        storeRef.current?.dispatch(logout());
      }
    }
    hydrateUserSession();
  }, [])

  return <Provider store={storeRef.current as AppStore}>{children}</Provider>
}
