'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

interface Asset {
  id: string;
  snapshot_type: string;
  birth_date: string | null;
  birth_place_name: string | null;
  ai_reading_generated_at: string | null;
  created_at: string;
}

export default function AssetsPage() {
  const t = useTranslations('account.assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account/assets')
      .then(res => res.json())
      .then(data => setAssets(data.assets || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          className="text-xs font-light tracking-[0.3em] uppercase mb-6"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {t('title')}
        </h1>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
          />
        </div>
      ) : assets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-3"
        >
          <FileText size={32} style={{ color: 'hsl(var(--muted-foreground) / 0.3)' }} />
          <p
            className="text-sm font-light"
            style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
          >
            {t('empty')}
          </p>
        </motion.div>
      ) : (
        assets.map((asset, idx) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-4 rounded-2xl"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <div
              className="text-sm font-light mb-1"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {t(`types.${asset.snapshot_type}`, { fallback: asset.snapshot_type } as any)}
            </div>
            {asset.birth_date && (
              <div
                className="text-xs"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {t('basedOn')} {asset.birth_date}
                {asset.birth_place_name && ` · ${asset.birth_place_name.split(',')[0]}`}
              </div>
            )}
            <div
              className="text-xs mt-1"
              style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
            >
              {new Date(asset.created_at).toLocaleDateString()}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
