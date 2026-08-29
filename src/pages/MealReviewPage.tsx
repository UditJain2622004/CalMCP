import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Trash2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { mealService } from '@/domain/meals/meal.service';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import type { MealDraft } from '@/domain/meals/meal.schema';
import { formatDateTime } from '@/domain/shared/dates';
import styles from './MealReviewPage.module.css';

export default function MealReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<MealDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    mealService.getDraft(id).then(d => {
      setDraft(d);
      setLoading(false);
    });
  }, [id]);

  const handleCommit = async () => {
    if (!id) return;
    setCommitting(true);
    setError(null);
    try {
      await mealService.commitDraft(id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm meal.');
      setCommitting(false);
    }
  };

  const handleDiscard = async () => {
    if (!id) return;
    setDiscarding(true);
    try {
      await mealService.discardDraft(id);
      navigate(-1);
    } catch {
      setDiscarding(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton style={{ height: 40, marginBottom: 16 }} />
        <Skeleton style={{ height: 200, borderRadius: 16, marginBottom: 12 }} />
        <Skeleton style={{ height: 100, borderRadius: 16 }} />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <AlertTriangle size={32} color="var(--color-warning)" />
          <h1>Draft not found</h1>
          <p>This draft may have expired or been committed already.</p>
          <Button onClick={() => navigate('/')}>Back to Today</Button>
        </div>
      </div>
    );
  }

  if (draft.status !== 'pending_review') {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <CheckCircle size={32} color="var(--color-accent)" />
          <h1>{draft.status === 'committed' ? 'Meal already confirmed' : 'Draft discarded'}</h1>
          <Button onClick={() => navigate('/')}>Back to Today</Button>
        </div>
      </div>
    );
  }

  const totalCals = draft.items.reduce((s, i) => s + i.nutrition.caloriesKcal, 0);
  const totalProtein = draft.items.reduce((s, i) => s + i.nutrition.proteinG, 0);
  const totalCarbs = draft.items.reduce((s, i) => s + i.nutrition.carbsG, 0);
  const totalFat = draft.items.reduce((s, i) => s + i.nutrition.fatG, 0);
  const lowConfidenceItems = draft.items.filter(i => (i.confidence ?? 1) < 0.6);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={styles.title}>Review Meal</h1>
          <p className={styles.subtitle}>Confirm or discard this agent-proposed meal</p>
        </div>
      </header>

      {/* Warning if low confidence items */}
      {lowConfidenceItems.length > 0 && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{lowConfidenceItems.length} item(s) have low confidence. Review carefully.</span>
        </div>
      )}

      {/* Meal summary */}
      <Card padding="lg" className={styles.summaryCard}>
        <h2 className={styles.mealName}>{draft.proposedTitle}</h2>
        <div className={styles.mealMeta}>
          <span className={styles.metaTag}>{draft.proposedMealType}</span>
          <span className={styles.metaTime}>{formatDateTime(draft.proposedEatenAt)}</span>
          {draft.overallConfidence !== undefined && (
            <span className={`${styles.metaTag} ${draft.overallConfidence < 0.6 ? styles.lowConf : ''}`}>
              {Math.round(draft.overallConfidence * 100)}% confidence
            </span>
          )}
        </div>

        <div className={styles.totals}>
          <div className={styles.totalCal}>
            <span className={styles.totalCalNum}>{Math.round(totalCals)}</span>
            <span className={styles.totalCalUnit}>kcal</span>
          </div>
          <div className={styles.macroRow}>
            <span style={{ color: 'var(--color-protein)' }}>P {Math.round(totalProtein)}g</span>
            <span style={{ color: 'var(--color-carbs)' }}>C {Math.round(totalCarbs)}g</span>
            <span style={{ color: 'var(--color-fat)' }}>F {Math.round(totalFat)}g</span>
          </div>
        </div>
      </Card>

      {/* Items list */}
      <section className={styles.itemsSection}>
        <h2 className={styles.sectionTitle}>
          Food Items ({draft.items.length})
        </h2>
        <div className={styles.itemsList}>
          {draft.items.map(item => {
            const lowConf = (item.confidence ?? 1) < 0.6;
            const isOpen = expandedItems.has(item.id);
            return (
              <div key={item.id} className={`${styles.item} ${lowConf ? styles.itemLowConf : ''}`}>
                <button
                  className={styles.itemHeader}
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemQty}>{item.quantity} {item.unit}</span>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={styles.itemCals}>{Math.round(item.nutrition.caloriesKcal)} kcal</span>
                    {lowConf && <AlertTriangle size={14} color="var(--color-warning)" aria-label="Low confidence" />}
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                {isOpen && (
                  <div className={styles.itemDetails}>
                    <div className={styles.itemMacros}>
                      <span>P: {item.nutrition.proteinG.toFixed(1)}g</span>
                      <span>C: {item.nutrition.carbsG.toFixed(1)}g</span>
                      <span>F: {item.nutrition.fatG.toFixed(1)}g</span>
                    </div>
                    {item.confidence !== undefined && (
                      <div className={styles.itemConf}>
                        Confidence: {Math.round(item.confidence * 100)}%
                        {lowConf && ' — Low confidence estimate'}
                      </div>
                    )}
                    {item.estimationNotes && (
                      <div className={styles.itemNotes}>{item.estimationNotes}</div>
                    )}
                    {item.brand && <div className={styles.itemBrand}>Brand: {item.brand}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Assumptions */}
      {draft.assumptions.length > 0 && (
        <section className={styles.assumptionsSection}>
          <h2 className={styles.sectionTitle}>Agent Assumptions</h2>
          <ul className={styles.assumptions}>
            {draft.assumptions.map((a, i) => (
              <li key={i} className={styles.assumption}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Actions */}
      {error && (
        <div className={styles.error} role="alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <p className={styles.actionNote}>
          By confirming, you're saying this looks correct. You can edit it from the diary afterward.
        </p>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          loading={committing}
          onClick={handleCommit}
          icon={<CheckCircle size={18} />}
        >
          Confirm Meal
        </Button>
        <Button
          variant="ghost"
          fullWidth
          loading={discarding}
          onClick={handleDiscard}
          icon={<Trash2 size={16} />}
        >
          Discard Draft
        </Button>
      </div>
    </div>
  );
}
