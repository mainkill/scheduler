import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfWeek = (date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const endOfWeek = (date) => {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfMonth = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfMonth = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const toInputDateTime = (date) => {
  const d = new Date(date);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const priorityOrder = {
  high: 0,
  medium: 1,
  low: 2,
};

const buttonBaseClass =
  'rounded-xl px-4 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500';

const inputBaseClass =
  'w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200';

// ─── Auth Page ───────────────────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = mode === 'register'
        ? { name, email, password }
        : { email, password };
      const res = await fetch(`${API_BASE}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '오류가 발생했습니다.');
        return;
      }
      localStorage.setItem('scheduler-token', data.token);
      localStorage.setItem('scheduler-user', JSON.stringify(data.user));
      onAuth(data.token, data.user);
    } catch {
      setError('서버에 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-aura flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-700 via-sky-700 to-emerald-600 p-7 text-white shadow-glow mb-4 text-center">
          <p className="font-display text-xs uppercase tracking-[0.22em] text-cyan-100">Scheduler MVP</p>
          <h1 className="mt-2 font-display text-3xl leading-tight">오늘의 계획을 빠르게 실행하세요</h1>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
          <h2 className="font-display text-xl text-slate-900 mb-4">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          {error && (
            <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 border border-rose-200">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="grid gap-3">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputBaseClass}
              />
            )}
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputBaseClass}
            />
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputBaseClass}
            />
            <button
              type="submit"
              disabled={loading}
              className={`${buttonBaseClass} bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-60`}
            >
              {loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입')}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-cyan-700 font-semibold hover:underline"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Scheduler App ────────────────────────────────────────────────────────────
function SchedulerApp({ token, user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(toInputDateTime(new Date()));
  const [priority, setPriority] = useState('medium');
  const [view, setView] = useState('week');
  const [query, setQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // Treat 401 as session expiry and log out
  const handleUnauth = useCallback(() => onLogout(), [onLogout]);

  // Load all tasks on mount
  useEffect(() => {
    setTasksLoading(true);
    fetch(`${API_BASE}/api/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { handleUnauth(); return null; }
        return res.json();
      })
      .then((data) => { if (data) setTasks(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, [token, handleUnauth]);

  const resetForm = () => {
    setTitle('');
    setDueDate(toInputDateTime(new Date()));
    setPriority('medium');
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      const res = await fetch(`${API_BASE}/api/tasks/${editingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ title: title.trim(), dueDate, priority }),
      });
      if (res.status === 401) { handleUnauth(); return; }
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        resetForm();
      }
      return;
    }

    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: title.trim(), dueDate, priority }),
    });
    if (res.status === 401) { handleUnauth(); return; }
    if (res.ok) {
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);
      resetForm();
    }
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDueDate(task.dueDate);
    setPriority(task.priority);
  };

  const handleDelete = async (id) => {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { handleUnauth(); return; }
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) resetForm();
    }
  };

  const toggleComplete = async (id) => {
    const res = await fetch(`${API_BASE}/api/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { handleUnauth(); return; }
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const period = useMemo(() => {
    const today = new Date();
    if (view === 'day') {
      return { start: startOfDay(today), end: endOfDay(today) };
    }
    if (view === 'month') {
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }
    return { start: startOfWeek(today), end: endOfWeek(today) };
  }, [view]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const due = new Date(task.dueDate);
        const inRange = due >= period.start && due <= period.end;
        const matchesQuery = task.title.toLowerCase().includes(query.toLowerCase());
        const completionOk = showCompleted ? true : task.status !== 'done';
        return inRange && matchesQuery && completionOk;
      })
      .sort((a, b) => {
        const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
        if (dateDiff !== 0) return dateDiff;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [tasks, period, query, showCompleted]);

  const doneCount = tasks.filter((task) => task.status === 'done').length;

  return (
    <div className="min-h-screen bg-aura pb-10">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 pt-8 sm:px-6 lg:px-8">

        <header className="rounded-3xl bg-gradient-to-br from-cyan-700 via-sky-700 to-emerald-600 p-7 text-white shadow-glow sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.22em] text-cyan-100">Scheduler MVP</p>
              <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">오늘의 계획을 빠르게 실행하세요</h1>
              <p className="mt-3 max-w-3xl text-sm text-cyan-50/95 sm:text-base">
                일정 등록, 우선순위 정렬, 완료 토글, 검색까지 한 화면에서 처리하는 MVP 대시보드입니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-sm font-medium text-cyan-100">{user.name}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur md:p-5">
          <div className="inline-flex gap-2 rounded-2xl bg-slate-200/90 p-1.5" role="group" aria-label="보기 전환">
            {['day', 'week', 'month'].map((option) => (
              <button
                key={option}
                type="button"
                className={`${buttonBaseClass} px-4 py-2 text-sm ${
                  view === option
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-transparent text-slate-600 hover:bg-white/70'
                }`}
                onClick={() => setView(option)}
              >
                {option === 'day' ? '일간' : option === 'week' ? '주간' : '월간'}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="제목으로 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${inputBaseClass} min-w-[220px] flex-1`}
            />
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(event) => setShowCompleted(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              완료 항목 보기
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur md:p-5">
          <h2 className="font-display text-xl text-slate-900">{editingId ? '할 일 수정' : '새 할 일 추가'}</h2>
          <form onSubmit={handleSubmit} className="mt-3 grid gap-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="할 일 제목"
              required
              className={inputBaseClass}
            />
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
              className={inputBaseClass}
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className={inputBaseClass}
            >
              <option value="high">높음</option>
              <option value="medium">중간</option>
              <option value="low">낮음</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className={`${buttonBaseClass} bg-cyan-700 text-white hover:bg-cyan-800`}>
                {editingId ? '수정 저장' : '추가'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className={`${buttonBaseClass} bg-slate-200 text-slate-700 hover:bg-slate-300`}
                  onClick={resetForm}
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="grid gap-2 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur sm:grid-cols-3 md:p-5">
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700">전체 항목: {tasks.length}</p>
          <p className="rounded-xl bg-cyan-50 px-4 py-3 text-center text-sm font-semibold text-cyan-800">완료 항목: {doneCount}</p>
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">현재 보기 결과: {visibleTasks.length}</p>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur md:p-5">
          <h2 className="font-display text-xl text-slate-900">일정 목록</h2>
          {tasksLoading ? (
            <p className="mt-2 text-sm text-slate-500">불러오는 중...</p>
          ) : visibleTasks.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">조건에 맞는 일정이 없습니다.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {visibleTasks.map((task) => (
                <li
                  key={task.id}
                  className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${
                    task.status === 'done' ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-baseline">
                    <strong className="text-slate-900">{task.title}</strong>
                    <span className="text-sm text-slate-500">{new Date(task.dueDate).toLocaleString('ko-KR')}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        task.priority === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : task.priority === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '중간' : '낮음'}
                    </span>
                    <button
                      type="button"
                      className={`${buttonBaseClass} bg-cyan-600 text-white hover:bg-cyan-700`}
                      onClick={() => toggleComplete(task.id)}
                    >
                      {task.status === 'done' ? '미완료로 변경' : '완료 처리'}
                    </button>
                    <button
                      type="button"
                      className={`${buttonBaseClass} bg-slate-200 text-slate-700 hover:bg-slate-300`}
                      onClick={() => handleEdit(task)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className={`${buttonBaseClass} bg-rose-600 text-white hover:bg-rose-700`}
                      onClick={() => handleDelete(task.id)}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [token, setToken] = useState(() => localStorage.getItem('scheduler-token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scheduler-user')); }
    catch { return null; }
  });

  const handleAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('scheduler-token');
    localStorage.removeItem('scheduler-user');
    setToken(null);
    setUser(null);
  }, []);

  if (!token || !user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return <SchedulerApp token={token} user={user} onLogout={handleLogout} />;
}

export default App;
