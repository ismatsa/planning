import React, { createContext, useContext } from 'react';
import { useAppStore } from './useStore';

type StoreType = ReturnType<typeof useAppStore>;

const StoreContext = createContext<StoreType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useAppStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
