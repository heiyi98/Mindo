"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

interface CityData {
  name: string;
  lat: number;
  lng: number;
}

interface CityPickerProps {
  onSelect: (cityData: CityData | null) => void;
  hideTitle?: boolean;
  hideConfirm?: boolean;
}

export default function CityPicker({ onSelect, hideTitle, hideConfirm }: CityPickerProps) {
  const t = useTranslations('onboarding.cityPicker');
  const locale = useLocale();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<CityData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim() || selectedCity) {
      setResults([]); setIsSearching(false); setError(false);
      return;
    }
    const fetchCities = async () => {
      setIsSearching(true); setError(false);
      try {
        const res = await fetch(`/api/city-search?q=${encodeURIComponent(debouncedQuery)}&lang=${locale}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setError(true); setResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    fetchCities();
  }, [debouncedQuery, locale, selectedCity]);

  const handleSelectCity = (city: CityData) => {
    setSelectedCity(city);
    setQuery(city.name);
    setResults([]);
    if (hideConfirm) {
      onSelect(city);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10 text-center">
      {!hideTitle && (
        <>
          <motion.h2
            className="text-2xl md:text-3xl font-light mb-4"
            style={{ color: 'hsl(var(--foreground))' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {t('title')}
          </motion.h2>

          <motion.p
            className="text-sm mb-12"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {t('description')}
          </motion.p>
        </>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="relative mb-12"
      >
        <div className="relative group">
          {selectedCity
            ? <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'hsl(var(--foreground))' }} />
            : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
          }
          <input
            type="text"
            value={query}
            onChange={(e) => { if (selectedCity) setSelectedCity(null); setQuery(e.target.value); }}
            placeholder={t('placeholder')}
            className="w-full rounded-2xl py-4 pl-12 pr-12 outline-none transition-all"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(var(--glass-blur))',
              color: 'hsl(var(--foreground))',
            }}
          />
          {isSearching && !selectedCity && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" style={{ color: 'hsl(var(--foreground))' }} />
          )}
          {selectedCity && (
            <button onClick={() => { setSelectedCity(null); setQuery(""); }} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5" style={{ color: 'hsl(var(--muted-foreground))' }} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {!selectedCity && (results.length > 0 || (query && !isSearching && results.length === 0) || error) && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{ background: 'hsl(var(--card))', border: '1px solid var(--glass-border)' }}
            >
              {error ? (
                <div className="p-4 text-center text-sm flex items-center justify-center gap-2" style={{ color: 'hsl(var(--destructive))' }}>
                  <AlertCircle className="w-4 h-4" />{t('error')}
                </div>
              ) : results.length === 0 && query && !isSearching ? (
                <div className="p-4 text-center text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('noResults')}</div>
              ) : (
                <ul className="max-h-60 overflow-y-auto py-2 text-left">
                  {results.map((city, idx) => (
                    <motion.li
                      key={`${city.lat}-${city.lng}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleSelectCity(city)}
                      className="px-4 py-3 cursor-pointer flex items-start gap-3 transition-colors"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium line-clamp-1">{city.name.split(',')[0]}</span>
                        <span className="text-xs line-clamp-1 mt-0.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{city.name}</span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {!hideConfirm && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => onSelect(selectedCity)}
          className="w-full px-12 py-4 text-base font-medium rounded-full hover:opacity-90 transition-all duration-300"
          style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
        >
          {selectedCity ? t('next') : t('skip')}
        </motion.button>
      )}
    </div>
  );
}
