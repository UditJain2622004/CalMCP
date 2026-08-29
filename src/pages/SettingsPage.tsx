import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Globe, Scale, Droplets, Save, ChevronRight, Trash2, AlertTriangle, Target, Bot } from 'lucide-react';
import { profileService } from '@/domain/profile/profile.service';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import type { Profile } from '@/domain/profile/profile.schema';
import { db } from '@/db/database';
import styles from './SettingsPage.module.css';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearModal, setClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [form, setForm] = useState({
    displayName: '',
    birthDate: '',
    heightCm: '',
    preferredWeightUnit: 'kg' as 'kg' | 'lb',
  });

  useEffect(() => {
    profileService.getProfile().then(p => {
      setProfile(p);
      setForm({
        displayName: p.displayName ?? '',
        birthDate: p.birthDate ?? '',
        heightCm: p.heightCm ? String(p.heightCm) : '',
        preferredWeightUnit: p.preferredWeightUnit,
      });
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileService.updateProfile({
        displayName: form.displayName || undefined,
        birthDate: form.birthDate || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        preferredWeightUnit: form.preferredWeightUnit,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    setClearing(true);
    try {
      await Promise.all([
        db.meals.clear(),
        db.mealItems.clear(),
        db.mealDrafts.clear(),
        db.waterEntries.clear(),
        db.weightEntries.clear(),
        db.captures.clear(),
        db.auditEvents.clear(),
      ]);
      setClearModal(false);
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setClearing(false);
    }
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      {/* Quick Navigation Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Target size={16} aria-hidden="true" />
          Quick Navigation
        </h2>
        <Card padding="none">
          {[
            { label: 'Nutritional Goals & Calorie Targets', route: '/goals', icon: Target },
            { label: 'Weight Tracking & Weigh-ins', route: '/weight', icon: Scale },
            { label: 'Hydration & Water Logging', route: '/hydration', icon: Droplets },
            { label: 'WebMCP Agent Tools Catalog', route: '/agent-tools', icon: Bot },
          ].map(({ label, route, icon: Icon }, idx) => (
            <div key={route}>
              {idx > 0 && <div className={styles.infoRowDivider} />}
              <div
                className={styles.infoRow}
                onClick={() => navigate(route)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color="var(--color-accent)" />
                  <span style={{ fontWeight: 500 }}>{label}</span>
                </div>
                <ChevronRight size={18} color="var(--color-text-secondary)" />
              </div>
            </div>
          ))}
        </Card>
      </section>

      <form onSubmit={handleSave}>
        {/* Profile */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <User size={16} aria-hidden="true" />
            Profile
          </h2>
          <Card padding="lg">
            <div className={styles.field}>
              <label htmlFor="displayName" className={styles.label}>Name</label>
              <input
                id="displayName"
                type="text"
                maxLength={100}
                value={form.displayName}
                onChange={update('displayName')}
                className={styles.input}
                placeholder="Your name (optional)"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="birthDate" className={styles.label}>Date of birth</label>
              <input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={update('birthDate')}
                className={styles.input}
              />
              <span className={styles.hint}>Used to calculate BMR. Optional, stays on device.</span>
            </div>
            <div className={styles.field}>
              <label htmlFor="heightCm" className={styles.label}>Height (cm)</label>
              <input
                id="heightCm"
                type="number"
                min="50"
                max="300"
                step="0.1"
                value={form.heightCm}
                onChange={update('heightCm')}
                className={styles.input}
                placeholder="e.g. 175"
              />
            </div>
          </Card>
        </section>

        {/* Units */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Scale size={16} aria-hidden="true" />
            Units
          </h2>
          <Card padding="lg">
            <div className={styles.field}>
              <label className={styles.label}>Weight unit</label>
              <div className={styles.toggle}>
                {(['kg', 'lb'] as const).map(unit => (
                  <label
                    key={unit}
                    className={`${styles.toggleOption} ${form.preferredWeightUnit === unit ? styles.toggleActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="weightUnit"
                      value={unit}
                      checked={form.preferredWeightUnit === unit}
                      onChange={update('preferredWeightUnit')}
                      className={styles.radioHidden}
                    />
                    {unit.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <Button type="submit" fullWidth loading={saving} icon={<Save size={16} />}>
          {saved ? '✓ Saved!' : 'Save Profile'}
        </Button>
      </form>

      {/* App Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Globe size={16} aria-hidden="true" />
          About
        </h2>
        <Card padding="none">
          <div className={styles.infoRow}>
            <span>Version</span>
            <span className={styles.infoValue}>{APP_VERSION}</span>
          </div>
          <div className={styles.infoRowDivider} />
          <div className={styles.infoRow}>
            <span>Storage</span>
            <span className={styles.infoValue}>IndexedDB (local device)</span>
          </div>
          <div className={styles.infoRowDivider} />
          <div className={styles.infoRow}>
            <span>WebMCP</span>
            <span className={styles.infoValue}>
              {'modelContext' in document ? '✓ Available' : '○ Not detected'}
            </span>
          </div>
        </Card>
      </section>

      {/* Privacy Note */}
      <Card padding="md" className={styles.privacyCard} variant="muted">
        <p className={styles.privacyText}>
          🔒 <strong>Your data stays on your device.</strong> CalMCPstores everything in your browser's IndexedDB. Nothing is uploaded to any server. Photos never leave this device.
        </p>
      </Card>

      {/* Danger Zone */}
      <section className={styles.section}>
        <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
          <Trash2 size={16} aria-hidden="true" />
          Danger Zone
        </h2>
        <Card padding="lg">
          <p className={styles.dangerDesc}>
            Permanently delete all meal logs, weight entries, and water entries. Your profile and goals will be kept.
          </p>
          <Button
            variant="danger"
            onClick={() => setClearModal(true)}
            icon={<Trash2 size={16} />}
          >
            Clear all tracking data
          </Button>
        </Card>
      </section>

      <Modal
        open={clearModal}
        onClose={() => setClearModal(false)}
        title="Clear all tracking data?"
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalWarning}>
            <AlertTriangle size={24} color="var(--color-danger)" aria-hidden="true" />
            <p>This will permanently delete all meals, weight entries, water logs, photos, and AI drafts. <strong>This cannot be undone.</strong></p>
          </div>
          <div className={styles.modalActions}>
            <Button variant="danger" fullWidth loading={clearing} onClick={handleClearData}>
              Yes, delete everything
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setClearModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
