import { createContext, useContext, useState, useCallback } from 'react';

interface LayoutContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
  sidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  return (
    <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
