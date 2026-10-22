(() => {
  "use strict";
  const STORAGE_KEY = "studyos-v1-data";
  const $ = (id) => document.getElementById(id);
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const parseDate = (s) => {
    const [y,m,d] = s.split("-").map(Number);
    return new Date(y, m-1, d, 12);
  };
  const dateISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const addDays = (date, amount) => { const d = new Date(date); d.setDate(d.getDate()+amount); return d; };
  const mondayOf = (date) => { const d = new Date(date); const day = (d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(12,0,0,0); return d; };
  const fmtDay = (s) => parseDate(s).toLocaleDateString(undefined,{month:"short",day:"numeric"});
  const fmtShortDay = (d) => d.toLocaleDateString(undefined,{weekday:"short"});
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const defaultState = () => ({ sessions: [], weeklyTarget: 18 });
  let state = loadState();
  let showAllSessions = false;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return defaultState();
      const data = JSON.parse(saved);
      return { sessions: Array.isArray(data.sessions) ? data.sessions : [], weeklyTarget: Number(data.weeklyTarget) > 0 ? Number(data.weeklyTarget) : 18 };
    } catch (e) {
      return defaultState();
    }
  }
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      showMessage("Could not save in this browser. Check storage/privacy settings.", true);
      return false;
    }
  }
  function showMessage(message, error=false) {
    const el = $("form-message");
    el.textContent = message;
    el.style.color = error ? "#fda4af" : "#86efac";
    if (message) setTimeout(() => { if (el.textContent === message) el.textContent = ""; }, 5000);
  }
  function selectedWeekStart() {
    const value = $("week-start").value;
    return value ? mondayOf(parseDate(value)) : mondayOf(parseDate(todayISO()));
  }
  function sessionsBetween(start, endExclusive) {
    return state.sessions.filter(s => s.date >= dateISO(start) && s.date < dateISO(endExclusive));
  }
  function totalMinutes(sessions) { return sessions.reduce((sum,s) => sum + Number(s.minutes || 0), 0); }
  function sumExercises(sessions) { return sessions.reduce((sum,s) => sum + Number(s.exercises || 0), 0); }
  function hoursLabel(minutes) { return (minutes/60).toFixed(1); }

  function render() {
    const start = selectedWeekStart();
    const end = addDays(start, 7);
    const weekSessions = sessionsBetween(start, end);
    const mins = totalMinutes(weekSessions);
    const studiedDays = new Set(weekSessions.map(s => s.date)).size;
    const consistency = Math.round(studiedDays / 7 * 100);
    const targetMins = state.weeklyTarget * 60;
    const goalPct = Math.min(100, Math.round(mins / Math.max(1,targetMins) * 100));

    $("week-hours").textContent = hoursLabel(mins);
    $("weekly-target-note").textContent = `of ${state.weeklyTarget}-hour target`;
    $("hours-progress").style.width = `${Math.min(100, mins/Math.max(1,targetMins)*100)}%`;
    $("consistency").textContent = consistency;
    $("consistency-note").textContent = `${studiedDays} of 7 days studied`;
    $("consistency-progress").style.width = `${consistency}%`;
    $("streak").textContent = calculateStreak();
    $("week-exercises").textContent = sumExercises(weekSessions);
    $("session-count").textContent = `${weekSessions.length} session${weekSessions.length===1?"":"s"} logged`;
    $("goal-percent").textContent = `${goalPct}%`;
    $("goal-ring").style.background = `conic-gradient(#a78bfa ${goalPct}%, #292438 ${goalPct}%)`;
    $("goal-hours").textContent = `${hoursLabel(mins)} / ${state.weeklyTarget} hrs`;
    $("goal-message").textContent = goalPct >= 100 ? "Target reached. Be proud of the work." : goalPct >= 60 ? "You're building real momentum." : mins > 0 ? "Every session moves you forward." : "Start with one focused session.";
    $("target-hours").value = state.weeklyTarget;
    renderChart(start, weekSessions);
    renderSubjects(weekSessions);
    renderHeatmap();
    renderSessions(showAllSessions ? state.sessions : weekSessions);
  }

  function calculateStreak() {
    const activeDates = new Set(state.sessions.map(s => s.date));
    let cursor = parseDate(todayISO());
    if (!activeDates.has(dateISO(cursor))) cursor = addDays(cursor, -1);
    let streak = 0;
    while (activeDates.has(dateISO(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
      if (streak > 3650) break;
    }
    return streak;
  }

  function renderChart(start, sessions) {
    const dayMins = Array(7).fill(0);
    sessions.forEach(s => {
      const index = Math.round((parseDate(s.date)-start)/86400000);
      if (index >= 0 && index < 7) dayMins[index] += Number(s.minutes || 0);
    });
    const max = Math.max(60, ...dayMins);
    $("week-chart").innerHTML = dayMins.map((m,i) => {
      const d = addDays(start,i);
      const today = dateISO(d) === todayISO();
      const height = m ? Math.max(5, m/max*100) : 0;
      return `<div class="chart-day ${today?"today":""}" title="${esc(fmtDay(dateISO(d)))}: ${hoursLabel(m)} hours"><div class="chart-value">${m ? hoursLabel(m)+"h" : "—"}</div><div class="bar-track"><div class="bar-fill" style="height:${height}%"></div></div><div class="chart-label">${fmtShortDay(d)}</div></div>`;
    }).join("");
    $("chart-total").textContent = `${hoursLabel(totalMinutes(sessions))} hours recorded`;
  }

  function renderSubjects(sessions) {
    const totals = {};
    sessions.forEach(s => totals[s.subject] = (totals[s.subject] || 0) + Number(s.minutes || 0));
    const rows = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
    if (!rows.length) {
      $("subject-breakdown").innerHTML = '<div class="empty-state">Your subject breakdown will appear after your first session.</div>';
      return;
    }
    const max = rows[0][1] || 1;
    $("subject-breakdown").innerHTML = rows.map(([name,mins]) => `<div class="subject-row"><div class="subject-name" title="${esc(name)}">${esc(name)}</div><div class="subject-bar"><span style="width:${mins/max*100}%"></span></div><div class="subject-hours">${hoursLabel(mins)}h</div></div>`).join("");
  }

  function renderHeatmap() {
    const today = parseDate(todayISO());
    const start = addDays(today, -83);
    const counts = {};
    state.sessions.forEach(s => counts[s.date] = (counts[s.date] || 0) + Number(s.minutes || 0));
    const firstMonday = mondayOf(start);
    const days = [];
    for (let i=0;i<84;i++) {
      const d = addDays(firstMonday,i);
      const key = dateISO(d);
      if (d < start || d > today) continue;
      const mins = counts[key] || 0;
      const level = mins === 0 ? 0 : mins < 30 ? 1 : mins < 90 ? 2 : mins < 180 ? 3 : 4;
      days.push(`<span class="heat h${level}" title="${esc(key)} · ${hoursLabel(mins)} study hours"></span>`);
    }
    $("heatmap").innerHTML = days.join("");
  }

  function renderSessions(sessions) {
    const sorted = [...sessions].sort((a,b) => b.date.localeCompare(a.date) || (b.createdAt||0)-(a.createdAt||0)).slice(0,30);
    if (!sorted.length) {
      $("session-table").innerHTML = '<tr><td colspan="5" class="empty-table">No sessions in this view yet. Log a study session above.</td></tr>';
      return;
    }
    $("session-table").innerHTML = sorted.map(s => `<tr><td>${esc(fmtDay(s.date))}</td><td><div class="subject-cell"><strong>${esc(s.subject)}</strong><span>${esc(s.note || "Study session")}</span></div></td><td class="duration-cell">${hoursLabel(s.minutes)}h</td><td>${Number(s.exercises)||0}</td><td><button class="delete-session" type="button" data-delete="${esc(s.id)}" aria-label="Delete session" title="Delete session">×</button></td></tr>`).join("");
  }

  $("session-form").addEventListener("submit", event => {
    event.preventDefault();
    const date = $("session-date").value;
    const minutes = Number($("duration").value);
    const exercises = Number($("exercises").value);
    if (!date || !Number.isFinite(minutes) || minutes < 1 || minutes > 1440 || !Number.isInteger(exercises) || exercises < 0) {
      showMessage("Please enter a valid date, duration, and exercise count.", true);
      return;
    }
    const session = {
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date,
      subject: $("subject").value,
      minutes,
      exercises,
      note: $("session-note").value.trim(),
      createdAt: Date.now()
    };
    state.sessions.push(session);
    if (saveState()) {
      $("week-start").value = dateISO(mondayOf(parseDate(date)));
      showAllSessions = false;
      render();
      $("duration").value = "";
      $("exercises").value = "0";
      $("session-note").value = "";
      showMessage("Session saved. That's another step forward.");
    }
  });

  $("week-start").addEventListener("change", () => {
    if (!$("week-start").value) return;
    $("week-start").value = dateISO(mondayOf(parseDate($("week-start").value)));
    showAllSessions = false;
    render();
  });
  $("save-target").addEventListener("click", () => {
    const target = Number($("target-hours").value);
    if (!Number.isFinite(target) || target < 1 || target > 100) {
      showMessage("Choose a weekly target between 1 and 100 hours.", true);
      return;
    }
    state.weeklyTarget = target;
    saveState();
    render();
    showMessage("Weekly target updated.");
  });
  $("clear-week-filter").addEventListener("click", () => {
    showAllSessions = !showAllSessions;
    $("clear-week-filter").textContent = showAllSessions ? "Show this week" : "Show all";
    render();
  });
  $("session-table").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    const id = button.getAttribute("data-delete");
    if (!confirm("Delete this study session? This cannot be undone.")) return;
    state.sessions = state.sessions.filter(s => s.id !== id);
    saveState();
    render();
  });
  $("export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(), ...state}, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `studyos-backup-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  $("reset-btn").addEventListener("click", () => {
    if (!confirm("Reset ALL StudyOS data, including every session and your weekly target? Export a backup first if you want to keep your records.")) return;
    state = defaultState();
    saveState();
    $("week-start").value = dateISO(mondayOf(parseDate(todayISO())));
    showAllSessions = false;
    $("clear-week-filter").textContent = "Show all";
    render();
    showMessage("Data reset. A fresh start.");
  });

  const today = parseDate(todayISO());
  $("today-label").textContent = today.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  $("week-start").value = dateISO(mondayOf(today));
  $("session-date").value = todayISO();
  render();
})();