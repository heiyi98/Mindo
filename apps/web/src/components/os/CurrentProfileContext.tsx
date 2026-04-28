'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface Profile {
  id: string;
  display_name: string;
  birth_date: string;
  is_self: boolean;
}

interface CurrentProfileContextType {
  currentProfile: Profile | null;
  profiles: Profile[];
  setCurrentProfile: (profile: Profile) => void;
  loading: boolean;
  refetch: () => void;
}

const CurrentProfileContext = createContext<CurrentProfileContextType | null>(null);

export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      const list: Profile[] = data.profiles || [];
      setProfiles(list);
      if (list.length > 0 && !currentProfile) {
        setCurrentProfileState(list.find(p => p.is_self) || list[0]);
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProfile]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const setCurrentProfile = useCallback((profile: Profile) => {
    setCurrentProfileState(profile);
  }, []);

  return (
    <CurrentProfileContext.Provider value={{
      currentProfile,
      profiles,
      setCurrentProfile,
      loading,
      refetch: fetchProfiles,
    }}>
      {children}
    </CurrentProfileContext.Provider>
  );
}

export function useCurrentProfile() {
  const ctx = useContext(CurrentProfileContext);
  if (!ctx) throw new Error('useCurrentProfile must be used within CurrentProfileProvider');
  return ctx;
}
