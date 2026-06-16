'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, MapPin, Loader2, X, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface RegionData {
  country: string | null;
  level1: string | null;
  level2: string | null;
  level3: string | null;
  display_name: string | null;
}

interface CityResult {
  name: string;
  lat: number;
  lng: number;
  timezone: string;
  region_country: string | null;
  region_level1: string | null;
  region_level2: string | null;
  region_level3: string | null;
}

interface BigFiveIntroProps {
  onStart: (regionData: RegionData | null) => void;
}

export default function BigFiveIntro({ onStart }: BigFiveIntroProps) {
  const t = useTranslations('bigfive');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [regionData, setRegionData] = useState<RegionData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim() || selectedCity) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    const fetchCities = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/city-search?q=${encodeURIComponent(debouncedQuery)}&lang=${locale}&needRegion=true`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchCities();
  }, [debouncedQuery, locale, selectedCity]);

  const handleSelectCity = (city: CityResult) => {
    setSelectedCity(city);
    setQuery(city.name.split(',')[0]);
    setResults([]);
    setRegionData({
      country: city.region_country,
      level1: city.region_level1,
      level2: city.region_level2,
      level3: city.region_level3,
      display_name: city.name.split(',')[0],
    });
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-8">
      {/* placeholder for future intro content */}
      <div />

      <div className="space-y-2">
        <label
          className="text-xs font-light tracking-wider uppercase"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {t('intro.cityLabel')}
        </label>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>
          {t('intro.cityHint')}
        </p>

        <div className="relative mt-2">
          <div className="relative">
            {selectedCity ? (
              <CheckCircle2
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'hsl(var(--foreground))' }}
              />
            ) : (
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              />
            )}
            <input
              type="text"
              value={query}
              onChange={e => {
                if (selectedCity) { setSelectedCity(null); setRegionData(null); }
                setQuery(e.target.value);
              }}
              placeholder={t('intro.cityPlaceholder')}
              className="w-full rounded-xl py-3 pl-10 pr-10 text-sm outline-none transition-colors"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            />
            {isSearching && !selectedCity && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              />
            )}
            {selectedCity && (
              <button
                onClick={() => { setSelectedCity(null); setRegionData(null); setQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {!selectedCity && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute top-[calc(100%+6px)] left-0 right-0 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              >
                <ul className="max-h-48 overflow-y-auto py-1">
                  {results.map((city, idx) => (
                    <li
                      key={`${city.lat}-${city.lng}-${idx}`}
                      onClick={() => handleSelectCity(city)}
                      className="px-3 py-2.5 cursor-pointer flex items-start gap-2 transition-colors hover:bg-foreground/5"
                    >
                      <MapPin
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: 'hsl(var(--muted-foreground))' }}
                      />
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium truncate">
                          {city.name.split(',')[0]}
                        </div>
                        <div
                          className="text-xs truncate mt-0.5"
                          style={{ color: 'hsl(var(--muted-foreground))' }}
                        >
                          {city.name}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={() => onStart(regionData)}
          className="w-full px-8 py-3 rounded-full text-sm font-medium transition-all hover:opacity-90"
          style={{
            background: 'hsl(var(--foreground))',
            color: 'hsl(var(--background))',
          }}
        >
          {t('intro.startTest')}
        </button>
        <button
          onClick={() => onStart(null)}
          className="text-xs px-4 py-2 transition-opacity hover:opacity-70"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {t('intro.skip')}
        </button>
      </div>
    </div>
  );
}
