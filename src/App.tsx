// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/** ──────────────────────────────────────────────────────────────────────────
 *  한국 공휴일(일/공휴일/대체공휴일) 2025~2026
 *  (임시공휴일/선거일은 필요 시 아래에 추가)
 *  ────────────────────────────────────────────────────────────────────────── */
const HOLIDAYS_KR = new Set<string>([
  /** 2025 */
  "2025-01-01",
  "2025-01-27",
  "2025-01-28",
  "2025-01-29",
  "2025-01-30",
  "2025-03-01",
  "2025-03-03",
  "2025-05-05",
  "2025-05-06",
  "2025-06-06",
  "2025-08-15",
  "2025-10-03",
  "2025-10-05",
  "2025-10-06",
  "2025-10-07",
  "2025-10-08",
  "2025-10-09",
  "2025-12-25",
  /** 2026 */
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-01",
  "2026-03-02",
  "2026-05-05",
  "2026-05-24",
  "2026-05-25",
  "2026-06-06",
  "2026-08-15",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-10-03",
  "2026-10-05",
  "2026-10-09",
  "2026-12-25",
]);

// ── Utils ─────────────────────────────────────────────────────────
const fmtDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const monthLabel = (y: number, mIndex: number) =>
  `${y}-${String(mIndex + 1).padStart(2, "0")}`;
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

// 억 단위 포맷
const formatEok = (v?: number | null) => {
  if (v == null || isNaN(v as number)) return "-";
  const num = (v as number) / 1e8;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}억`;
};

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

// ── UI atoms ──────────────────────────────────────────────────────
function Button({
  children,
  variant = "primary",
  onClick,
  href,
  type = "button",
  className = "",
}: {
  children: any;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: any;
  href?: string;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-2xl transition-colors focus:outline-none focus:ring-4 active:scale-[0.98] whitespace-nowrap";
  const styles: Record<string, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200",
    secondary:
      "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200",
    ghost:
      "bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-100",
  };
  const Comp: any = href ? "a" : "button";
  return (
    <Comp
      type={type}
      href={href}
      onClick={onClick}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </Comp>
  );
}
function Card({ children, className = "" }: { children: any; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl shadow-lg ${className}`}>
      {children}
    </div>
  );
}
function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      type={type}
      className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 ${className}`}
    />
  );
}
function TextArea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: any;
  onChange: (v: any) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange((e.target as HTMLTextAreaElement).value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-indigo-100 ${className}`}
      rows={3}
    />
  );
}
function SectionHeader({ title, action }: { title: string; action?: any }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

// ── Calendar + Todos ──────────────────────────────────────────────
function Calendar({
  current,
  onPrev,
  onNext,
  selected,
  onSelect,
  todos,
}: {
  current: Date;
  onPrev: () => void;
  onNext: () => void;
  selected: Date | null;
  onSelect: (d: Date) => void;
  todos: Record<string, any[]>;
}) {
  const start = startOfMonth(current);
  const end = endOfMonth(current);
  const startWeekday = (start.getDay() + 6) % 7; // Mon=0
  const daysInMonth = end.getDate();

  const { countMap, starMap } = useMemo(() => {
    const c: Record<string, number> = {};
    const s: Record<string, number> = {};
    Object.entries(todos || {}).forEach(([k, arr]) => {
      const list: any[] = Array.isArray(arr) ? arr : [];
      c[k] = list.length;
      s[k] = list.reduce((m, it) => Math.max(m, Number((it as any).stars) || 0), 0);
    });
    return { countMap: c, starMap: s };
  }, [todos]);

  const days = useMemo(() => {
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++)
      arr.push(new Date(current.getFullYear(), current.getMonth(), d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [current]);

  const label = `${current.getFullYear()}년 ${String(current.getMonth() + 1).padStart(
    2,
    "0"
  )}월`;

  return (
    <Card>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onPrev}>이전</Button>
          <div className="text-gray-900 font-semibold">{label}</div>
          <Button variant="secondary" onClick={onNext}>다음</Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 p-3 text-center text-xs text-gray-500">
        {["월", "화", "수", "목", "금", "토", "일"].map((w) => (
          <div key={w} className="py-2 font-semibold">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
        {days.map((d, i) => {
          const isSelected = d && selected && fmtDateKey(d) === fmtDateKey(selected!);
          const key = d ? fmtDateKey(d) : null;
          const cnt = key ? countMap[key] || 0 : 0;
          const stars = key ? starMap[key] || 0 : 0;
          const dots = Array.from({ length: Math.min(cnt, 10) });

          const isSunday = d ? d.getDay() === 0 : false;
          const isHoliday = d ? HOLIDAYS_KR.has(fmtDateKey(d)) : false;
          const dateColorClass = isSelected
            ? "text-white"
            : isSunday || isHoliday
            ? "text-red-500"
            : "text-gray-800";

          return (
            <button
              key={i}
              disabled={!d}
              onClick={() => d && onSelect(d)}
              className={`h-20 rounded-xl border text-sm flex flex-col items-center p-2 transition ${
                d
                  ? isSelected
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white hover:bg-indigo-50 border-gray-200"
                  : "bg-gray-50 border-transparent cursor-default"
              }`}
            >
              <span className={`self-end ${dateColorClass}`}>{d ? d.getDate() : ""}</span>
              {d && <div className="mt-1 text-amber-500 text-xs">{"★".repeat(Math.min(stars, 3))}</div>}
              {d && (
                <div className={`mt-auto mb-1 flex flex-wrap gap-1 justify-center ${isSelected ? "text-white" : "text-red-500"}`}>
                  {dots.map((_, idx) => (
                    <span key={idx} className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-red-500"}`}></span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TodoPanel({
  date,
  todos,
  setTodos,
}: {
  date: Date | null;
  todos: Record<string, any[]>;
  setTodos: (v: any) => void;
}) {
  const key = date ? fmtDateKey(date) : null;
  const [text, setText] = useState("");
  const [stars, setStars] = useState(0);

  const dayTodos = useMemo(
    () => (key && todos[key] ? todos[key] : []),
    [key, todos]
  );

  const add = () => {
    if (!key || !text.trim()) return;
    const item = {
      id: crypto.randomUUID(),
      text: text.trim(),
      done: false,
      stars: Number(stars) || 0,
    };
    setTodos({ ...todos, [key]: [...dayTodos, item] });
    setText("");
    setStars(0);
  };
  const toggle = (id: string) => {
    const n: any = { ...todos };
    n[key!] = dayTodos.map((t: any) => (t.id === id ? { ...t, done: !t.done } : t));
    setTodos(n);
  };
  const setItemStars = (id: string, s: number) => {
    const n: any = { ...todos };
    n[key!] = dayTodos.map((t: any) => (t.id === id ? { ...t, stars: s } : t));
    setTodos(n);
  };
  const remove = (id: string) => {
    const n: any = { ...todos };
    n[key!] = dayTodos.filter((t: any) => t.id !== id);
    setTodos(n);
  };

  const StarEdit = ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3].ma
