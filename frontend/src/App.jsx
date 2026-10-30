
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Plus,
  RefreshCw,
  BookOpen,
  ListTodo,
  Search,
  ArrowRight,
  Clock3,
  Menu,
  X,
  Upload,
  FileText
} from "lucide-react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState("");

  const [recap, setRecap] = useState(null);
  const [brief, setBrief] = useState("");

  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const [meetingData, taskData] = await Promise.all([
      api("/api/meetings"),
      api("/api/tasks")
    ]);

    setMeetings(meetingData);
    setTasks(taskData);

    if (!selectedMeeting && meetingData.length) {
      setSelectedMeeting(String(meetingData[0].id));
    }
  }

  useEffect(() => {
    refresh().catch(err => setError(err.message));
  }, []);

  const openTasks = tasks.filter(task => task.status !== "closed");

  const overdueTasks = openTasks.filter(task =>
    task.due_date &&
    task.due_date < new Date().toISOString().slice(0, 10)
  );

  const completeHandoverTasks = openTasks.filter(task =>
    task.owner && task.due_date
  );

  const continuityScore = openTasks.length
    ? Math.round(
        (completeHandoverTasks.length / openTasks.length) * 100
      )
    : 100;

  function navigate(nextView) {
    setView(nextView);
    setSidebarOpen(false);
    setError("");
    setMessage("");
  }

  async function createMeeting(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setRecap(null);

    try {
      const meeting = await api("/api/meetings", {
        method: "POST",
        body: JSON.stringify({
          title,
          agenda,
          participants: participants
            .split(",")
            .map(p => p.trim())
            .filter(Boolean),
          notes
        })
      });

      setSelectedMeeting(String(meeting.id));
      setMessage("Meeting saved successfully.");
      setTitle("");
      setAgenda("");
      setParticipants("");
      setNotes("");

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateRecap() {
    if (!selectedMeeting) {
      setError("Create or select a meeting first.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setRecap(null);

    try {
      const result = await api(
        `/api/meetings/${selectedMeeting}/recap`,
        { method: "POST" }
      );

      setRecap(result);
      setMessage("AI recap generated and saved.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTask(task, changes) {
    setError("");
    setMessage("");

    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes)
      });

      setMessage("Task updated.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function closeTask(task) {
    const outcome = window.prompt(
      `What was the outcome of "${task.description}"?`
    );

    if (!outcome?.trim()) return;

    setError("");
    setMessage("");

    try {
      await api(`/api/tasks/${task.id}/close`, {
        method: "POST",
        body: JSON.stringify({ outcome: outcome.trim() })
      });

      setMessage("Task closed and outcome recorded.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function carryForward() {
    const sourceId = Number(selectedMeeting);
    const target = meetings.find(m => m.id !== sourceId);

    if (!sourceId || !target) {
      setError("Create a second meeting before carrying tasks forward.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const result = await api(
        `/api/meetings/${sourceId}/carry-forward`,
        {
          method: "POST",
          body: JSON.stringify({ targetMeetingId: target.id })
        }
      );

      setMessage(
        `${result.carriedForward} open tasks linked to "${target.title}".`
      );

      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function generateBrief() {
    if (!selectedMeeting) return;

    setLoading(true);
    setError("");
    setBrief("");

    try {
      const result = await api(
        `/api/meetings/${selectedMeeting}/brief`,
        { method: "POST" }
      );

      setBrief(result.brief);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveKnowledge(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          title: knowledgeTitle,
          content: knowledgeContent
        })
      });

      setKnowledgeTitle("");
      setKnowledgeContent("");
      setMessage("Knowledge document saved.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Unsupported file. Please upload a .txt or .md file.");
      e.target.value = "";
      return;
    }

    setUploadingDocument(true);
    setError("");
    setMessage("");

    try {
      const content = await file.text();

      if (!content.trim()) {
        throw new Error("The selected document is empty.");
      }

      await api("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          title: file.name,
          content
        })
      });

      setMessage(`"${file.name}" uploaded and saved to the Knowledge Base.`);
      setKnowledgeTitle("");
      setKnowledgeContent("");

      if (knowledgeQuery.trim()) {
        const results = await api(
          `/api/knowledge/search?q=${encodeURIComponent(knowledgeQuery)}`
        );
        setKnowledgeResults(results);
      }
    } catch (err) {
      setError(err.message || "Document upload failed.");
    } finally {
      setUploadingDocument(false);
      e.target.value = "";
    }
  }

  async function searchKnowledge(e) {
    e.preventDefault();
    setError("");

    try {
      const results = await api(
        `/api/knowledge/search?q=${encodeURIComponent(knowledgeQuery)}`
      );

      setKnowledgeResults(results);
    } catch (err) {
      setError(err.message);
    }
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "meetings", label: "Meetings", icon: CalendarDays },
    { id: "tasks", label: "Tasks & Actions", icon: ListTodo },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen }
  ];

  const pageInfo = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Your team's meetings, decisions and work in one place."
    },
    meetings: {
      title: "Meetings",
      subtitle: "Capture discussions and turn them into actionable outcomes."
    },
    tasks: {
      title: "Tasks & Actions",
      subtitle: "Track ownership, deadlines and task completion."
    },
    knowledge: {
      title: "Knowledge Base",
      subtitle: "Save, upload and find information your team can reuse."
    }
  };

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Sparkles size={23} />
          </div>
          <div>
            <h1>SyncSpace<span> AI</span></h1>
            <p>TEAM WORKSPACE</p>
          </div>
          <button
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <p className="nav-caption">WORKSPACE</p>

        <nav className="side-nav">
          {navItems.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={`nav-link ${view === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "tasks" && openTasks.length > 0 && (
                  <span className="nav-count">{openTasks.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={19} />
            <strong>Keep work moving</strong>
            <p>Turn meeting context into clear next steps.</p>
          </div>
          <p className="sidebar-version">SyncSpace AI · Team productivity</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={21} />
          </button>

          <div className="page-heading">
            <h2>{pageInfo[view].title}</h2>
            <p>{pageInfo[view].subtitle}</p>
          </div>

          <button
            className="secondary refresh-button"
            disabled={loading}
            onClick={() => {
              setError("");
              setMessage("");
              refresh().catch(err => setError(err.message));
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {error && (
          <div className="notice error">
            <CircleAlert size={18} /> {error}
          </div>
        )}

        {message && (
          <div className="notice success">
            <CheckCircle2 size={18} /> {message}
          </div>
        )}

        {view === "dashboard" && (
          <>
            <section className="welcome-banner">
              <div>
                <span className="eyebrow">TEAM OVERVIEW</span>
                <h2>Good work starts with shared context.</h2>
                <p>
                  Stay on top of meetings, follow-ups and the knowledge
                  your team builds together.
                </p>
                <button onClick={() => navigate("meetings")}>
                  <Plus size={17} /> Create a meeting
                </button>
              </div>
              <div className="welcome-art">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-core"><Sparkles size={35} /></div>
              </div>
            </section>

            <section className="stats">
              <Stat icon={<CalendarDays />} label="Total meetings" value={meetings.length} tone="purple" />
              <Stat icon={<ListTodo />} label="Open tasks" value={openTasks.length} tone="blue" />
              <Stat icon={<CircleAlert />} label="Overdue tasks" value={overdueTasks.length} tone="orange" />
              <Stat icon={<CheckCircle2 />} label="Continuity score" value={`${continuityScore}%`} tone="green" />
            </section>

            <div className="dashboard-grid">
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h3>Recent meetings</h3>
                    <p>Your team's latest meeting records.</p>
                  </div>
                  <button className="text-button" onClick={() => navigate("meetings")}>
                    View meetings <ArrowRight size={15} />
                  </button>
                </div>

                {meetings.length === 0 ? (
                  <div className="empty-state">
                    <CalendarDays size={28} />
                    <strong>No meetings yet</strong>
                    <p>Create your first meeting to get started.</p>
                    <button onClick={() => navigate("meetings")}>Create meeting</button>
                  </div>
                ) : (
                  <div className="recent-list">
                    {meetings.slice(0, 5).map(meeting => (
                      <article className="recent-item" key={meeting.id}>
                        <div className="recent-icon"><CalendarDays size={19} /></div>
                        <div className="recent-info">
                          <strong>{meeting.title}</strong>
                          <p>{meeting.agenda || "Meeting notes and decisions"}</p>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Open ${meeting.title}`}
                          onClick={() => {
                            setSelectedMeeting(String(meeting.id));
                            navigate("meetings");
                          }}
                        >
                          <ArrowRight size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="panel continuity-panel">
                <div className="section-heading">
                  <div>
                    <h3>Context continuity</h3>
                    <p>Are open tasks ready for handover?</p>
                  </div>
                  <div className="metric-icon"><CheckCircle2 size={20} /></div>
                </div>

                <div className="score-display">
                  <strong>{continuityScore}%</strong>
                  <span>tasks with owner & deadline</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${continuityScore}%` }} />
                </div>
                <div className="score-details">
                  <span>{completeHandoverTasks.length} ready for handover</span>
                  <span>{openTasks.length} open total</span>
                </div>

                <div className="tip-row">
                  <Clock3 size={18} />
                  <p>
                    {openTasks.length - completeHandoverTasks.length > 0
                      ? `${openTasks.length - completeHandoverTasks.length} open task(s) need an owner or due date.`
                      : "All open tasks have an owner and a due date."}
                  </p>
                </div>

                <button className="secondary full-button" onClick={() => navigate("tasks")}>
                  Review action items <ArrowRight size={16} />
                </button>
              </section>
            </div>

            <section className="quick-actions">
              <button className="quick-action" onClick={() => navigate("meetings")}>
                <div className="quick-icon purple"><Plus size={20} /></div>
                <span><strong>New meeting</strong><small>Capture notes and decisions</small></span>
                <ArrowRight size={17} />
              </button>
              <button className="quick-action" onClick={() => navigate("tasks")}>
                <div className="quick-icon blue"><ListTodo size={20} /></div>
                <span><strong>Manage tasks</strong><small>Update owners and deadlines</small></span>
                <ArrowRight size={17} />
              </button>
              <button className="quick-action" onClick={() => navigate("knowledge")}>
                <div className="quick-icon green"><BookOpen size={20} /></div>
                <span><strong>Team knowledge</strong><small>Upload or search information</small></span>
                <ArrowRight size={17} />
              </button>
            </section>
          </>
        )}

        {view === "meetings" && (
          <div className="content-grid">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h3><Plus size={19} /> Create a meeting</h3>
                  <p>Capture the discussion and decisions.</p>
                </div>
              </div>

              <form onSubmit={createMeeting} className="form">
                <label>
                  Meeting title *
                  <input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Product launch planning" />
                </label>

                <label>
                  Agenda
                  <textarea value={agenda} onChange={e => setAgenda(e.target.value)} placeholder="What needs to be discussed?" rows={2} />
                </label>

                <label>
                  Participants
                  <input value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Aarav, Priya, Rahul" />
                </label>

                <label>
                  Meeting notes *
                  <textarea required value={notes} onChange={e => setNotes(e.target.value)} placeholder="Write the raw meeting notes here..." rows={5} />
                </label>

                <button type="submit" disabled={loading}>
                  <Plus size={17} /> {loading ? "Saving..." : "Save meeting"}
                </button>
              </form>

              <div className="subsection">
                <h3>Meeting history</h3>
                {meetings.length === 0 ? (
                  <p className="muted">Your saved meetings will appear here.</p>
                ) : (
                  <div className="recent-list">
                    {meetings.map(meeting => (
                      <button
                        key={meeting.id}
                        className={`meeting-choice ${selectedMeeting === String(meeting.id) ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedMeeting(String(meeting.id));
                          setRecap(null);
                          setBrief("");
                        }}
                      >
                        <CalendarDays size={17} />
                        <span>{meeting.title}</span>
                        {selectedMeeting === String(meeting.id) && <CheckCircle2 size={17} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h3><Sparkles size={19} /> AI meeting assistant</h3>
                  <p>Generate a recap or catch-up brief.</p>
                </div>
              </div>

              <label className="field-label">
                Select meeting
                <select
                  value={selectedMeeting}
                  onChange={e => {
                    setSelectedMeeting(e.target.value);
                    setRecap(null);
                    setBrief("");
                  }}
                >
                  <option value="">Choose a meeting</option>
                  {meetings.map(meeting => (
                    <option key={meeting.id} value={meeting.id}>{meeting.title}</option>
                  ))}
                </select>
              </label>

              <div className="button-row">
                <button disabled={loading || !selectedMeeting} onClick={generateRecap}>
                  <Sparkles size={16} /> {loading ? "Working..." : "Generate recap"}
                </button>
                <button className="secondary" disabled={loading || !selectedMeeting} onClick={generateBrief}>
                  Catch-up brief
                </button>
              </div>

              {recap && (
                <div className="ai-result">
                  <h4>Meeting summary</h4>
                  <p>{recap.summary || "No summary available."}</p>
                  <h4>Decisions</h4>
                  {recap.decisions?.length
                    ? <ul>{recap.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                    : <p>No decisions extracted.</p>}
                  <h4>Extracted action items</h4>
                  {recap.action_items?.length
                    ? recap.action_items.map((item, i) => (
                        <div className="mini-task" key={i}>
                          <strong>{item.description}</strong>
                          <p>Owner: {item.owner || "Unassigned"}</p>
                          <p>Due: {item.due_date || "Not specified"}</p>
                        </div>
                      ))
                    : <p>No action items extracted.</p>}
                </div>
              )}

              {brief && (
                <div className="ai-result">
                  <h4>Catch-up brief</h4>
                  <p className="brief-text">{brief}</p>
                </div>
              )}

              <div className="subsection">
                <h3>Meeting continuity</h3>
                <p className="muted">Link unfinished work to another meeting to maintain context.</p>
                <button className="secondary full-button" disabled={!selectedMeeting || meetings.length < 2} onClick={carryForward}>
                  Carry open tasks to another meeting
                </button>
                <p className="hint">This action uses the first other meeting in the list.</p>
              </div>
            </section>
          </div>
        )}

        {view === "tasks" && (
          <>
            <section className="stats task-stats">
              <Stat icon={<ListTodo />} label="Open tasks" value={openTasks.length} tone="blue" />
              <Stat icon={<CircleAlert />} label="Overdue" value={overdueTasks.length} tone="orange" />
              <Stat icon={<CheckCircle2 />} label="Ready for handover" value={completeHandoverTasks.length} tone="green" />
              <Stat icon={<CheckCircle2 />} label="Continuity score" value={`${continuityScore}%`} tone="purple" />
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h3><ListTodo size={19} /> Action items</h3>
                  <p>Assign ownership, update deadlines and record outcomes.</p>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="empty-state">
                  <ListTodo size={28} />
                  <strong>No action items yet</strong>
                  <p>Create a meeting and generate an AI recap to extract tasks.</p>
                  <button onClick={() => navigate("meetings")}>Go to meetings</button>
                </div>
              ) : (
                <div className="task-list">
                  {tasks.map(task => (
                    <article className="task" key={task.id}>
                      <div className="task-info">
                        <h4>{task.description}</h4>
                        <p>Source: {task.source_meeting_title || "Meeting"}</p>
                        {task.outcome && <p>Outcome: {task.outcome}</p>}
                      </div>

                      <label className="compact-field">
                        Owner
                        <input
                          key={`${task.id}-${task.owner}`}
                          defaultValue={task.owner || ""}
                          placeholder="Unassigned"
                          onBlur={e => {
                            const owner = e.target.value.trim() || null;
                            if (owner !== task.owner) updateTask(task, { owner });
                          }}
                        />
                      </label>

                      <label className="compact-field">
                        Due date
                        <input
                          type="date"
                          value={task.due_date || ""}
                          onChange={e => updateTask(task, { due_date: e.target.value || null })}
                        />
                      </label>

                      <label className="compact-field">
                        Status
                        <select value={task.status} onChange={e => updateTask(task, { status: e.target.value })}>
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="closed">Closed</option>
                        </select>
                      </label>

                      {task.status !== "closed" && (
                        <button className="complete-button" onClick={() => closeTask(task)}>
                          <CheckCircle2 size={16} /> Close
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {view === "knowledge" && (
          <div className="content-grid">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h3><BookOpen size={19} /> Add team knowledge</h3>
                  <p>Save reference information for future use.</p>
                </div>
              </div>

              <form className="form" onSubmit={saveKnowledge}>
                <label>
                  Document title *
                  <input required value={knowledgeTitle} onChange={e => setKnowledgeTitle(e.target.value)} maxLength={200} placeholder="e.g. Deployment guidelines" />
                </label>
                <label>
                  Content *
                  <textarea required rows={7} value={knowledgeContent} onChange={e => setKnowledgeContent(e.target.value)} placeholder="Write team decisions, procedures or reference notes..." />
                </label>
                <button type="submit">
                  <Plus size={17} /> Save document
                </button>
              </form>

              <div className="upload-box">
                <div className="section-heading">
                  <div>
                    <h3><Upload size={19} /> Upload a document</h3>
                    <p>Import a text file into your searchable Knowledge Base.</p>
                  </div>
                </div>

                <label className="upload-label" htmlFor="knowledge-document">
                  <FileText size={30} />
                  <strong>{uploadingDocument ? "Uploading document..." : "Choose a file to upload"}</strong>
                  <span>TXT and Markdown (.md), up to the limits of your backend</span>
                </label>

                <input
                  id="knowledge-document"
                  className="document-file-input"
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDocument}
                />

                <p className="hint">
                  The document text will be saved to your existing knowledge database.
                </p>
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <h3><Search size={19} /> Search team knowledge</h3>
                  <p>Find saved documents and relevant meetings.</p>
                </div>
              </div>

              <form className="form" onSubmit={searchKnowledge}>
                <label>
                  Search keywords
                  <input value={knowledgeQuery} onChange={e => setKnowledgeQuery(e.target.value)} placeholder="e.g. deployment" required />
                </label>
                <button type="submit">
                  <Search size={16} /> Search
                </button>
              </form>

              {knowledgeResults && (
                <div className="search-results">
                  <h4>Documents</h4>
                  {(knowledgeResults.documents || []).map(doc => (
                    <article className="mini-task" key={`doc-${doc.id}`}>
                      <strong>{doc.title}</strong>
                      <p>{doc.content}</p>
                    </article>
                  ))}

                  {!(knowledgeResults.documents || []).length && (
                    <p className="muted">No matching documents.</p>
                  )}

                  <h4>Meetings</h4>
                  {(knowledgeResults.meetings || []).map(meeting => (
                    <article className="mini-task" key={`meeting-${meeting.id}`}>
                      <strong>{meeting.title}</strong>
                      <p>{meeting.summary || meeting.notes || "No summary available."}</p>
                    </article>
                  ))}

                  {!(knowledgeResults.documents || []).length &&
                    !(knowledgeResults.meetings || []).length && (
                      <div className="empty-state">
                        <Search size={25} />
                        <strong>No matching results</strong>
                        <p>Try another keyword.</p>
                      </div>
                    )}
                </div>
              )}
            </section>
          </div>
        )}

        <footer>
          SyncSpace AI <span>·</span> Meeting context that moves with the work
        </footer>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, tone = "purple" }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
