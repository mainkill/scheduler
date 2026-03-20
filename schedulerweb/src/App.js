import { useMemo, useState } from 'react';

const STORAGE_KEY = 'scheduler-mvp-tasks';

const getInitialTasks = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

function App() {
  const [tasks, setTasks] = useState(getInitialTasks);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(toInputDateTime(new Date()));
  const [priority, setPriority] = useState('medium');
  const [view, setView] = useState('week');
  const [query, setQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const persistTasks = (nextTasks) => {
    setTasks(nextTasks);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));
  };

  const resetForm = () => {
    setTitle('');
    setDueDate(toInputDateTime(new Date()));
    setPriority('medium');
    setEditingId(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    if (editingId) {
      const next = tasks.map((task) =>
        task.id === editingId
          ? {
              ...task,
              title: title.trim(),
              dueDate,
              priority,
              updatedAt: new Date().toISOString(),
            }
          : task
      );
      persistTasks(next);
      resetForm();
      return;
    }

    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      dueDate,
      priority,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    };

    persistTasks([newTask, ...tasks]);
    resetForm();
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setTitle(task.title);
    setDueDate(task.dueDate);
    setPriority(task.priority);
  };

  const handleDelete = (id) => {
    const next = tasks.filter((task) => task.id !== id);
    persistTasks(next);
    if (editingId === id) {
      resetForm();
    }
  };

  const toggleComplete = (id) => {
    const next = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            status: task.status === 'done' ? 'todo' : 'done',
            updatedAt: new Date().toISOString(),
          }
        : task
    );

    persistTasks(next);
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
        if (dateDiff !== 0) {
          return dateDiff;
        }
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [tasks, period, query, showCompleted]);

  const doneCount = tasks.filter((task) => task.status === 'done').length;

  const buttonBaseClass =
    'rounded-xl px-4 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500';

  const inputBaseClass =
    'w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200';

  return (
    <div className="min-h-screen bg-aura pb-10">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 pt-8 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-gradient-to-br from-cyan-700 via-sky-700 to-emerald-600 p-7 text-white shadow-glow sm:p-10">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-cyan-100">Scheduler MVP</p>
        <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">오늘의 계획을 빠르게 실행하세요</h1>
        <p className="mt-3 max-w-3xl text-sm text-cyan-50/95 sm:text-base">
          일정 등록, 우선순위 정렬, 완료 토글, 검색까지 한 화면에서 처리하는 MVP
          대시보드입니다.
        </p>
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
        {visibleTasks.length === 0 ? (
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
                    {task.priority === 'high'
                      ? '높음'
                      : task.priority === 'medium'
                        ? '중간'
                        : '낮음'}
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

export default App;
