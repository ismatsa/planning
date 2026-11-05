import { createContext, useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const SidebarContext = createContext({ collapsed: false, toggle: () => {} });
export const useSidebarState = () => useContext(SidebarContext);

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed(c => !c) }}>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <main className={`min-h-screen transition-all duration-200 ${collapsed ? 'ml-0' : 'ml-16 lg:ml-56'}`}>
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
