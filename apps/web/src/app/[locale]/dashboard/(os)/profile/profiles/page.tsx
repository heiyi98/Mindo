'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Trash2, Plus, Pencil } from 'lucide-react';
import ProfileEditModal from '@/components/dashboard/ProfileEditModal';

interface Profile {
  id: string;
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_place_name: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  birth_timezone: string | null;
  gender: 'M' | 'F' | null;
  is_self: boolean;
}

export default function ProfilesPage() {
  const t = useTranslations('account.profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProfiles = () => {
    fetch('/api/profiles')
      .then(res => {
        console.log('[profiles] status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('[profiles] data:', data);
        setProfiles(data.profiles || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfiles(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    fetchProfiles();
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

      {loading ? (
        <div className="flex justify-center py-12">
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'hsl(var(--foreground) / 0.3)' }}
          />
        </div>
      ) : (
        <>
          {profiles.map((profile, idx) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <div>
                <div
                  className="text-sm font-light"
                  style={{ color: 'hsl(var(--foreground))' }}
                >
                  {profile.display_name}
                  {profile.is_self && (
                    <span
                      className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'hsl(var(--foreground) / 0.08)',
                        color: 'hsl(var(--muted-foreground))',
                      }}
                    >
                      {t('self')}
                    </span>
                  )}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  {profile.birth_date}
                  {profile.birth_place_name && ` · ${profile.birth_place_name.split(',')[0]}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingProfile(profile)}
                  className="p-2 rounded-lg transition-colors hover:bg-muted/30"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  <Pencil size={14} />
                </button>
                {!profile.is_self && (
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="p-2 rounded-lg transition-colors hover:bg-destructive/10"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-light transition-colors"
            style={{
              border: '1px dashed hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))',
            }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={14} />
            {t('add')}
          </motion.button>
        </>
      )}

      {editingProfile && (
        <ProfileEditModal
          profile={editingProfile}
          mode="edit"
          onClose={() => setEditingProfile(null)}
          onSave={fetchProfiles}
        />
      )}

      {showCreateModal && (
        <ProfileEditModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSave={fetchProfiles}
        />
      )}
    </div>
  );
}
