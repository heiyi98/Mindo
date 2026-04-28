'use client';
import {createContext, useContext, useState, useCallback, ReactNode} from 'react';

interface TopBarContent {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}

interface TopBarContextType {
  content: TopBarContent;
  setContent: (content: TopBarContent) => void;
}

const TopBarContext = createContext<TopBarContextType | null>(null);

export function TopBarProvider({children}: {children: ReactNode}) {
  const [content, setContentState] = useState<TopBarContent>({});
  const setContent = useCallback((newContent: TopBarContent) => {
    setContentState(newContent);
  }, []);
  return (
    <TopBarContext.Provider value={{content, setContent}}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  const ctx = useContext(TopBarContext);
  if (!ctx) throw new Error('useTopBar must be used within TopBarProvider');
  return ctx;
}
