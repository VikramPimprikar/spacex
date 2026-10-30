
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Plus,
  RefreshCw,
  BookOpen,
  ListTodo
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
    ? Math.round(completeHandoverTasks.length / openTasks.length * 100)
    : 100;

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
      setMessage("Meeting saved. Your notes are preserved.");

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

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={23} />
          </div>
          <div>
            <h1>SyncSpace AI</h1>
            <p>Team knowledge & task continuity</p>
          </div>
        </div>
        <button className="secondary" onClick={() => {
          setError("");
          setMessage("");
          refresh().catch(err => setError(err.message));
        }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && (
        <div className="notice error">
          <CircleAlert size={18} /> {error}
        </div>
      )}

      {message && <div className="notice success">{message}</div>}

      <section className="stats">
        <Stat icon={<CalendarDays />} label="Meetings" value={meetings.length} />
        <Stat icon={<ListTodo />} label="Open tasks" value={openTasks.length} />
        <Stat icon={<CircleAlert />} label="Overdue" value={overdueTasks.length} />
        <Stat
          icon={<CheckCircle2 />}
          label="Continuity score"
          value={`${continuityScore}%`}
        />
      </section>

      <div className="main-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2><Plus size={20} /> Create a meeting</h2>
              <p>Capture the discussion and decisions.</p>
            </div>
          </div>

          <form onSubmit={createMeeting} className="form">
            <label>
              Meeting title *
              <input
                required
                maxLength={200}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Product launch planning"
              />
            </label>

            <label>
              Agenda
              <textarea
                value={agenda}
                onChange={e => setAgenda(e.target.value)}
                placeholder="What needs to be discussed?"
                rows={2}
              />
            </label>

            <label>
              Participants
              <input
                value={participants}
                onChange={e => setParticipants(e.target.value)}
                placeholder="Aarav, Priya, Rahul"
              />
            </label>

            <label>
              Meeting notes *
              <textarea
                required
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Write the raw meeting notes here..."
                rows={5}
              />
            </label>

            <button type="submit" disabled={loading}>
              <Plus size={17} /> Save meeting
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2><Sparkles size={20} /> AI assistant</h2>
              <p>Generate recaps and handover briefs.</p>
            </div>
          </div>

          <label>
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
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button disabled={loading || !selectedMeeting} onClick={generateRecap}>
              <Sparkles size={16} /> Generate recap
            </button>
            <button
              className="secondary"
              disabled={loading || !selectedMeeting}
              onClick={generateBrief}
            >
              Catch-up brief
            </button>
          </div>

          {recap && (
            <div className="ai-result">
              <h3>Meeting summary</h3>
              <p>{recap.summary}</p>

              <h3>Decisions</h3>
              {recap.decisions.length
                ? <ul>{recap.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                : <p>No decisions extracted.</p>}

              <h3>Extracted action items</h3>
              {recap.action_items.map((item, i) => (
                <div className="mini-task" key={i}>
                  <strong>{item.description}</strong>
                  <p>Owner: {item.owner || "Unassigned"}</p>
                  <p>Due: {item.due_date || "Not specified"}</p>
                </div>
              ))}
            </div>
          )}

          {brief && (
            <div className="ai-result">
              <h3>Catch-up brief</h3>
              <p className="brief-text">{brief}</p>
            </div>
          )}

          <button
            className="secondary full-button"
            disabled={!selectedMeeting || meetings.length < 2}
            onClick={carryForward}
          >
            Carry open tasks to another meeting
          </button>

          <p className="hint">
            The carry-forward action uses the first other meeting in the list.
          </p>
        </section>
      </div>

      <section className="panel task-panel">
        <div className="section-heading">
          <div>
            <h2><ListTodo size={20} /> Action items</h2>
            <p>Track ownership, deadlines and completion.</p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="empty">No tasks yet. Create a meeting and generate an AI recap.</p>
        ) : (
          <div className="task-list">
            {tasks.map(task => (
              <article className="task" key={task.id}>
                <div className="task-info">
                  <h3>{task.description}</h3>
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
                    onChange={e => updateTask(task, {
                      due_date: e.target.value || null
                    })}
                  />
                </label>

                <label className="compact-field">
                  Status
                  <select
                    value={task.status}
                    onChange={e => updateTask(task, { status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>

                {task.status !== "closed" && (
                  <button
                    className="complete-button"
                    onClick={() => closeTask(task)}
                  >
                    <CheckCircle2 size={16} /> Close
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="main-grid">
        <section className="panel">
          <h2><BookOpen size={20} /> Knowledge base</h2>
          <p className="muted">Save team decisions and reference documents.</p>

          <form className="form" onSubmit={saveKnowledge}>
            <label>
              Document title *
              <input
                required
                value={knowledgeTitle}
                onChange={e => setKnowledgeTitle(e.target.value)}
                maxLength={200}
              />
            </label>
            <label>
              Content *
              <textarea
                required
                rows={4}
                value={knowledgeContent}
                onChange={e => setKnowledgeContent(e.target.value)}
              />
            </label>
            <button type="submit">Save document</button>
          </form>
        </section>

        <section className="panel">
          <h2><BookOpen size={20} /> Search team knowledge</h2>

          <form className="form" onSubmit={searchKnowledge}>
            <label>
              Search meetings and documents
              <input
                value={knowledgeQuery}
                onChange={e => setKnowledgeQuery(e.target.value)}
                placeholder="e.g. deployment"
                required
              />
            </label>
            <button type="submit">Search</button>
          </form>

          {knowledgeResults && (
            <div className="search-results">
              <h3>Documents</h3>
              {knowledgeResults.documents.map(doc => (
                <article className="mini-task" key={`doc-${doc.id}`}>
                  <strong>{doc.title}</strong>
                  <p>{doc.content}</p>
                </article>
              ))}

              <h3>Meetings</h3>
              {knowledgeResults.meetings.map(meeting => (
                <article className="mini-task" key={`meeting-${meeting.id}`}>
                  <strong>{meeting.title}</strong>
                  <p>{meeting.summary || meeting.notes}</p>
                </article>
              ))}

              {!knowledgeResults.documents.length &&
                !knowledgeResults.meetings.length &&
                <p>No matching results found.</p>}
            </div>
          )}
        </section>
      </section>

      <footer>
        SyncSpace AI · Meeting context that moves with the work
      </footer>
    </main>
  );
}

function Stat({ icon, label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
