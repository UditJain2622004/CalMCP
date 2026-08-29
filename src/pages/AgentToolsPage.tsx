import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Shield, CheckCircle, XCircle, Clock, BookOpen, ArrowLeft } from 'lucide-react';
import { useWebMCP } from '@/webmcp/WebMCPProvider';
import { ALL_TOOLS } from '@/webmcp/register-tools';
import { Card } from '@/components/common/Card';
import { db } from '@/db/database';
import type { AuditEvent } from '@/db/database';
import styles from './AgentToolsPage.module.css';

export default function AgentToolsPage() {
  const navigate = useNavigate();
  const { isAvailable } = useWebMCP();
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [activeSection, setActiveSection] = useState<'tools' | 'audit'>('tools');

  useEffect(() => {
    db.auditEvents
      .orderBy('occurredAt')
      .reverse()
      .limit(50)
      .toArray()
      .then(events => {
        setAuditLog(events);
        setLoadingLog(false);
      });
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <Bot size={24} color="var(--color-accent)" aria-hidden="true" />
        <h1 className={styles.title}>Agent Tools</h1>
      </header>

      {/* Status banner */}
      <div className={`${styles.statusBanner} ${isAvailable ? styles.statusOk : styles.statusOffline}`}>
        {isAvailable
          ? <><CheckCircle size={18} /> <span>WebMCP active — {ALL_TOOLS.length} tools registered</span></>
          : <><XCircle size={18} /> <span>WebMCP not detected — tools registered but agent not connected</span></>
        }
      </div>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        <button
          className={`${styles.tab} ${activeSection === 'tools' ? styles.tabActive : ''}`}
          onClick={() => setActiveSection('tools')}
          role="tab"
          aria-selected={activeSection === 'tools'}
          id="tab-tools"
          aria-controls="panel-tools"
        >
          Tools ({ALL_TOOLS.length})
        </button>
        <button
          className={`${styles.tab} ${activeSection === 'audit' ? styles.tabActive : ''}`}
          onClick={() => setActiveSection('audit')}
          role="tab"
          aria-selected={activeSection === 'audit'}
          id="tab-audit"
          aria-controls="panel-audit"
        >
          Audit Log
        </button>
      </div>

      {/* Tools panel */}
      {activeSection === 'tools' && (
        <div id="panel-tools" role="tabpanel" aria-labelledby="tab-tools">
          <p className={styles.toolsNote}>
            These tools are exposed to AI agents via the <code>document.modelContext</code> WebMCP API.
            They only run when an AI agent explicitly calls them.
          </p>
          <div className={styles.toolList}>
            {ALL_TOOLS.map(tool => (
              <Card key={tool.name} padding="md" className={styles.toolCard}>
                <div className={styles.toolHeader}>
                  <code className={styles.toolName}>{tool.name}</code>
                  {tool.annotations?.readOnlyHint && (
                    <span className={styles.badge} style={{ background: 'rgba(50,166,106,0.1)', color: 'var(--color-accent)' }}>
                      read-only
                    </span>
                  )}
                  {!tool.annotations?.readOnlyHint && (
                    <span className={styles.badge} style={{ background: 'rgba(201,140,73,0.1)', color: 'var(--color-carbs)' }}>
                      write
                    </span>
                  )}
                  {tool.annotations?.untrustedContentHint && (
                    <span className={styles.badge} style={{ background: 'rgba(200,74,74,0.1)', color: 'var(--color-danger)' }}>
                      untrusted content
                    </span>
                  )}
                </div>
                <p className={styles.toolDesc}>{tool.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Audit panel */}
      {activeSection === 'audit' && (
        <div id="panel-audit" role="tabpanel" aria-labelledby="tab-audit">
          <p className={styles.toolsNote}>
            A record of all actions taken by AI agents via WebMCP tools.
          </p>
          {loadingLog ? (
            <p className={styles.loading}>Loading…</p>
          ) : auditLog.length === 0 ? (
            <div className={styles.noAudit}>
              <BookOpen size={32} strokeWidth={1.5} color="var(--color-text-subtle)" />
              <p>No agent actions recorded yet.</p>
            </div>
          ) : (
            <div className={styles.auditList}>
              {auditLog.map(event => (
                <div key={event.id} className={styles.auditItem}>
                  <div className={styles.auditIcon}>
                    <Bot size={14} />
                  </div>
                  <div className={styles.auditContent}>
                    <div className={styles.auditSummary}>{event.summary}</div>
                    <div className={styles.auditMeta}>
                      <code className={styles.auditTool}>{event.toolName}</code>
                      <span className={styles.auditTime}>
                        <Clock size={12} aria-hidden="true" />
                        {new Date(event.occurredAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guide */}
      <details className={styles.guide}>
        <summary className={styles.guideSummary}>How does agent logging work?</summary>
        <div className={styles.guideBody}>
          <p>
            CalMCPregisters tools with your browser's <strong>WebMCP</strong> API (<code>document.modelContext</code>).
            When a compatible AI agent (e.g. Claude, Gemini) browses to this app, it can discover and call these tools.
          </p>
          <p>
            <strong>The agent workflow:</strong>
          </p>
          <ol>
            <li>Open this app in your AI agent's browser.</li>
            <li>Ask your agent to log a meal, analyze a photo, or review progress.</li>
            <li>The agent calls <code>get_app_guide</code> to learn the workflow.</li>
            <li>It creates a draft with <code>create_meal_draft</code>.</li>
            <li>You review the draft on the <strong>Review Meal</strong> screen.</li>
            <li>After confirming, the agent calls <code>commit_meal_draft</code>.</li>
          </ol>
          <p>All agent actions appear in the audit log above.</p>
        </div>
      </details>
    </div>
  );
}
