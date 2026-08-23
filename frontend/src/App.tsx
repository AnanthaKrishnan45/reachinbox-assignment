import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";
type Stats = {
  scheduled: number;
  sent: number;
  failed: number;
};
type CampaignForm = {
  subject: string;
  body: string;
  recipients: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
};

const initialForm: CampaignForm = {
  subject: "",
  body: "",
  recipients: "",
  startTime: "",
  delaySeconds: 2,
  hourlyLimit: 200,
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showComposer, setShowComposer] = useState(false);
  const [stats, setStats] = useState<Stats>({
    scheduled: 0,
    sent: 0,
    failed: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);

 useEffect(() => {
  async function loadStats() {
    try {
      const response = await fetch(`${API_URL}/api/emails/stats`);
      const data = await response.json();

      if (data.success) {
        setStats({
          scheduled: data.scheduled ?? 0,
          sent: data.sent ?? 0,
          failed: data.failed ?? 0,
        });
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }

  loadStats();

  const interval = setInterval(loadStats, 5000);

  return () => clearInterval(interval);
}, []);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <span>ReachInbox</span>
        </div>

        <nav>
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={activeTab === "scheduled" ? "active" : ""}
            onClick={() => setActiveTab("scheduled")}
          >
            <span>◷</span>
            Scheduled
          </button>

          <button
            className={activeTab === "sent" ? "active" : ""}
            onClick={() => setActiveTab("sent")}
          >
            <span>✓</span>
            Sent
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            Backend connected
          </div>

          <div className="profile">
            <div className="avatar">A</div>
            <div>
              <strong>Demo User</strong>
              <small>demo@reachinbox.local</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">EMAIL AUTOMATION</p>

            <h1>
              {activeTab === "dashboard" && "Campaign dashboard"}
              {activeTab === "scheduled" && "Scheduled emails"}
              {activeTab === "sent" && "Sent emails"}
            </h1>
          </div>

          <div className="server-status">
            <span className="status-dot" />
            localhost:5000
          </div>
        </header>

        {activeTab === "dashboard" && (
          <Dashboard
  onNewCampaign={() => setShowComposer(true)}
  stats={stats}
  statsLoading={statsLoading}
/>
        )}

        {activeTab === "scheduled" && <Scheduled />}

        {activeTab === "sent" && <Sent />}
      </main>

      {showComposer && (
        <CampaignComposer onClose={() => setShowComposer(false)} />
      )}
    </div>
  );
}

function Dashboard({
  onNewCampaign,
  stats,
  statsLoading,
}: {
  onNewCampaign: () => void;
  stats: Stats;
  statsLoading: boolean;
}) {
  return (
    <section className="content">
      <div className="hero-card">
        <div>
          <span className="badge">QUEUE ACTIVE</span>

          <h2>Automate your outreach.</h2>

          <p>
            Schedule email campaigns with controlled delivery,
            background processing and reliable retries.
          </p>
        </div>

        <div className="hero-number">
          <strong>200</strong>
          <span>emails / hour</span>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span>Scheduled</span>
        <strong>{statsLoading ? "..." : stats.scheduled}</strong>
          <small>Waiting to be sent</small>
        </div>

        <div className="stat-card">
          <span>Sent</span>
          <strong>{statsLoading ? "..." : stats.sent}</strong>
          <small>Successfully delivered</small>
        </div>

        <div className="stat-card">
          <span>Failed</span>
         <strong>{statsLoading ? "..." : stats.failed}</strong> 
          <small>Requires attention</small>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <div>
            <h3>Schedule a campaign</h3>
            <p>Create a new email delivery campaign.</p>
          </div>

          <button
            className="primary-button"
            onClick={onNewCampaign}
          >
            + New campaign
          </button>
        </div>
      </div>
    </section>
  );
  }
  
function CampaignComposer({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  function updateField<K extends keyof CampaignForm>(
    field: K,
    value: CampaignForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setResult(null);

    const recipients = form.recipients
      .split(/[\n,]+/)
      .map((email) => email.trim())
      .filter(Boolean);

    if (!form.subject.trim()) {
      setResult({
        success: false,
        message: "Subject is required.",
      });
      setLoading(false);
      return;
    }

    if (!form.body.trim()) {
      setResult({
        success: false,
        message: "Email body is required.",
      });
      setLoading(false);
      return;
    }

    if (recipients.length === 0) {
      setResult({
        success: false,
        message: "Add at least one recipient.",
      });
      setLoading(false);
      return;
    }

    if (!form.startTime) {
      setResult({
        success: false,
        message: "Choose a start time.",
      });
      setLoading(false);
      return;
    }

    const startTime = new Date(form.startTime);

    if (startTime <= new Date()) {
      setResult({
        success: false,
        message: "Start time must be in the future.",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/emails/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: form.subject.trim(),
          body: form.body.trim(),
          recipients,
          startTime: startTime.toISOString(),
          delaySeconds: Number(form.delaySeconds),
          hourlyLimit: Number(form.hourlyLimit),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to schedule campaign.");
      }

      setResult({
        success: true,
        message: `Campaign scheduled successfully. ${data.scheduledCount} emails queued.`,
      });

      setForm(initialForm);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to connect to the backend.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="composer"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="composer-header">
          <div>
            <p className="eyebrow">NEW CAMPAIGN</p>
            <h2>Schedule email campaign</h2>
          </div>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Subject
            <input
              value={form.subject}
              onChange={(e) =>
                updateField("subject", e.target.value)
              }
              placeholder="Your email subject"
            />
          </label>

          <label>
            Recipients
            <textarea
              value={form.recipients}
              onChange={(e) =>
                updateField("recipients", e.target.value)
              }
              placeholder={
                "recipient1@example.com\nrecipient2@example.com"
              }
              rows={4}
            />
            <small>
              Enter one email per line or separate emails with commas.
            </small>
          </label>

          <label>
            Email body
            <textarea
              value={form.body}
              onChange={(e) =>
                updateField("body", e.target.value)
              }
              placeholder="Write your email..."
              rows={6}
            />
          </label>

          <div className="form-grid">
            <label>
              Start time
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) =>
                  updateField("startTime", e.target.value)
                }
              />
            </label>

            <label>
              Delay between emails
              <input
                type="number"
                min="0"
                value={form.delaySeconds}
                onChange={(e) =>
                  updateField(
                    "delaySeconds",
                    Number(e.target.value)
                  )
                }
              />
            </label>
          </div>

          <label>
            Hourly limit
            <input
              type="number"
              min="1"
              max="200"
              value={form.hourlyLimit}
              onChange={(e) =>
                updateField(
                  "hourlyLimit",
                  Number(e.target.value)
                )
              }
            />
          </label>

          {result && (
            <div
              className={
                result.success
                  ? "form-result success"
                  : "form-result error"
              }
            >
              {result.success ? "✓" : "!"} {result.message}
            </div>
          )}

          <div className="composer-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? "Scheduling..." : "Schedule campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Scheduled() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadScheduled() {
      try {
        const response = await fetch(
          `${API_URL}/api/emails/scheduled`
        );

        const data = await response.json();

        if (data.success) {
          setJobs(data.jobs);
        }
      } catch (error) {
        console.error("Failed to load scheduled emails:", error);
      } finally {
        setLoading(false);
      }
    }

    loadScheduled();
  }, []);

  return (
    <section className="content">
      <div className="section-card">
        <div className="section-header">
          <div>
            <h3>Scheduled emails</h3>
            <p>Your queued email jobs.</p>
          </div>

          <span className="badge">
            {jobs.length} scheduled
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading scheduled emails...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◷</div>
            <h2>No scheduled emails</h2>
            <p>Your queued emails will appear here.</p>
          </div>
        ) : (
          <div className="email-list">
            {jobs.map((job) => (
              <div className="email-row" key={job.id}>
                <div>
                  <strong>{job.subject}</strong>
                  <span>{job.recipient}</span>
                </div>

                <div className="email-meta">
                  <span>
                    {new Date(job.scheduledAt).toLocaleString()}
                  </span>

                  <span className="status scheduled">
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
function Sent() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSent() {
      try {
        const response = await fetch(
          `${API_URL}/api/emails/sent`
        );

        const data = await response.json();

        if (data.success) {
          setJobs(data.jobs);
        }
      } catch (error) {
        console.error("Failed to load sent emails:", error);
      } finally {
        setLoading(false);
      }
    }

    loadSent();
  }, []);

  return (
    <section className="content">
      <div className="section-card">
        <div className="section-header">
          <div>
            <h3>Sent emails</h3>
            <p>Successfully processed email jobs.</p>
          </div>

          <span className="badge">
            {jobs.length} sent
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading sent emails...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h2>No sent emails</h2>
            <p>Successfully processed emails will appear here.</p>
          </div>
        ) : (
          <div className="email-list">
            {jobs.map((job) => (
              <div className="email-row" key={job.id}>
                <div>
                  <strong>{job.subject}</strong>
                  <span>{job.recipient}</span>
                </div>

                <div className="email-meta">
                  <span>
                    {job.sentAt
                      ? new Date(job.sentAt).toLocaleString()
                      : "—"}
                  </span>

                  <span className="status sent">
                    {job.status}
                  </span>

                  {job.previewUrl && (
                    <a
                      href={job.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="preview-link"
                    >
                      Preview
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
export default App;

