import { createContext, useContext, useEffect, useState } from 'react';

const DebugContext = createContext(null);

export function DebugProvider({ children }) {
  const [debugMode, setDebugMode] = useState(
    () => localStorage.getItem('c4_debug') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('c4_debug', debugMode);
  }, [debugMode]);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDebugMode(v => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <DebugContext.Provider value={{ debugMode }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebugMode() {
  return useContext(DebugContext);
}
