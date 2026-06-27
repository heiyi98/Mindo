'use client';
import { createContext, useContext, useState, useCallback } from 'react';

interface GridContextType {
  expandCard: (cardId: string, extraRows: number) => void;
  collapseCard: (cardId: string) => void;
  expandedCards: Map<string, number>;
}

const GridContext = createContext<GridContextType | null>(null);

export function GridProvider({ children }: { children: React.ReactNode }) {
  const [expandedCards, setExpandedCards] = useState<Map<string, number>>(new Map());

  const expandCard = useCallback((cardId: string, extraRows: number) => {
    setExpandedCards(prev => new Map(prev).set(cardId, extraRows));
  }, []);

  const collapseCard = useCallback((cardId: string) => {
    setExpandedCards(prev => {
      const next = new Map(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  return (
    <GridContext.Provider value={{ expandCard, collapseCard, expandedCards }}>
      {children}
    </GridContext.Provider>
  );
}

export function useGridContext() {
  return useContext(GridContext); // 返回null时静默失败
}
