import React, { createContext, useContext } from 'react';
import { useAppStore } from './useStore';
import { useDevisStore } from './useDevisStore';

type StoreType = ReturnType<typeof useAppStore>;
type DevisStoreType = ReturnType<typeof useDevisStore>;

interface CombinedStore extends StoreType {
  devis: DevisStoreType;
}

const StoreContext = createContext<CombinedStore | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useAppStore();
  const devisStore = useDevisStore();
  const combined: CombinedStore = { ...store, devis: devisStore };
  return <StoreContext.Provider value={combined}>{children}</StoreContext.Provider>;
}

export function useStore(): CombinedStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
