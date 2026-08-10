'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { FileText, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PendingAssetsTab from '@/components/payments/PendingAssetsTab';

interface Asset {
  id: string;
  type: string;
  profile_id: string;
  profile_display_name: string | null;
  birth_date: string | null;
  birth_place_name: string | null;
  solar_time: string | null;
  ai_reading_status: string | null;
  created_at: string;
}

type Tab = 'purchased' | 'pending';

export default function AssetsPage() {
  const t = useTranslations('account.assets');
  const tAssets = useTranslations('assets');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('purchased');
  const { data, isLoading: loading } = useQuery({
    queryKey: ['account-assets'],
    queryFn: async () => {
      const res = await fetch('/api/account/assets');
      if (!res.ok) throw new Error('Failed to fetch assets');
      return res.json();
    },
  });
  const assets: Asset[] = data?.assets ?? [];

  const handleAssetClick = (asset: Asset) => {
    router.push(`/dashboard/assessments/bazi/reading?readingId=${asset.id}`);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/reading/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete reading');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-assets'] });
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (window.confirm(t('deleteConfirm'))) {
      deleteMutation.mutate(asset.id);
    }
  };

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

      <div className="flex gap-2 justify-center mb-2">
        {(['purchased', 'pending'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className="px-4 py-2 rounded-xl text-sm font-light"
            style={{
              background: tab === tabKey ? 'hsl(var(--foreground) / 0.08)' : 'transparent',
              color: 'hsl(var(--foreground))',
            }}
          >
            {tAssets(`tabs.${tabKey}`)}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingAssetsTab />}

      {tab === 'purchased' && (loading ? (
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
            className="p-4 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handleAssetClick(asset)}
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div
                  className="text-sm font-light mb-1"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {t(`types.${asset.type}`, { fallback: asset.type } as any)}
                </div>
                {asset.profile_display_name && (
                  <div
                    className="text-xs mb-0.5"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {asset.profile_display_name}
                  </div>
                )}
                {asset.birth_date && (
                  <div
                    className="text-xs"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    {asset.birth_date}
                    {asset.solar_time && ` ${asset.solar_time}`}
                    {/* 出生地不再截断，完整显示填资料时选择的地点 */}
                    {asset.birth_place_name && ` · ${asset.birth_place_name}`}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                >
                  {new Date(asset.created_at).toLocaleDateString()}
                </div>
                {asset.type === 'bazi' && (
                  <button
                    type="button"
                    aria-label={t('delete')}
                    onClick={(e) => handleDeleteClick(e, asset)}
                    disabled={deleteMutation.isPending}
                    className="p-1 rounded-lg hover:opacity-70 transition-opacity disabled:opacity-40"
                    style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))
      ))}
    </div>
  );
}