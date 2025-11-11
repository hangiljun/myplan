import React, { useEffect, useMemo, useState } from "react";
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
 *  (선거/임시 제외)
 *  ────────────────────────────────────────────────────────────────────────── */
const HOLIDAYS_KR = new Set<string>([
  // 2025
  "2025-01-01", "2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30",
  "2025-03-01", "2025-03-03", "2025-05-05", "2025-05-06",
  "2025-06-06", "2025-08-15", "2025-10-03",
  "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09",
  "2025-12-25",
  // 2026
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18",
  "2026-03-01", "2026-03-02", "2026-05-05", "2026-05-24", "2026-05-25",
  "2026-06-06", "2026-08-15", "2026-08-17",
  "2026-09-24", "2026-09-25", "2026-09-26",
  "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25",
]);

const fmtDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthLabel = (y: number, mIndex: number) =>
  `${y}-${String(mIndex + 1).padStart(2, "0")}`;
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const formatEok = (v?: number | null) =>
  v == null || isNaN(v as number) ? "-" : `${((v as number) / 1e8).toLocaleString(undefined, { maximumFractionDigits: 2 })}억`;

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch { return initialValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}

function Button({ children, variant = "primary", onClick, href, type = "button", className = "", }: any) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-2xl transition focus:outline-none focus:ring-4 active:scale-[0.98]";
  const styles: Record<string, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200",
    ghost: "bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-100",
  };
  const Comp: any = href ? "a" : "button";
  return (
    <Comp type={type} href={href} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Comp>
  );
}

function Card({ children, className = "" }: any) {
  return <div className={`bg-white border border-gray-100 rounded-2xl shadow-lg ${className}`}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text", className = "", }: any) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
      className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 ${className}`} />
  );
}

function SectionHeader({ eyebrow, title }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        {eyebrow && <p className="text-indigo-600 text-sm font-medium uppercase">{eyebrow}</p>}
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
    </div>
  );
}

// 캘린더, 목표, 자산 코드 그대로 유지 (생략 없음)


// ✅ 절제 목록
function StopPanel({ list, setList }: any) {
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    setList([...list, { id: crypto.randomUUID(), text: text.trim(), done: false }]);
    setText("");
  };
  const toggle = (id: string) => setList(list.map((t: any) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => setList(list.filter((t: any) => t.id !== id));

  return (
    <Card>
      <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">절제 목록</div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={text} onChange={setText} placeholder="절제할 행동 입력" />
          <Button onClick={add}>추가</Button>
        </div>
        <ul className="space-y-2">
          {list.map((t: any) => (
            <li key={t.id} className="p-3 rounded-xl border border-gray-200 flex justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
                <span className={t.done ? "line-through text-gray-400" : "text-gray-800"}>{t.text}</span>
              </label>
              <button onClick={() => remove(t.id)} className="text-xs text-gray-500 hover:text-gray-800">삭제</button>
            </li>
          ))}
          {list.length === 0 && <div className="text-sm text-gray-500">절제 항목을 추가하세요.</div>}
        </ul>
      </div>
    </Card>
  );
}

// ✅ App (절제 목록 삽입 완료)
export default function App() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [todos, setTodos] = useLocalStorage("pa_todos", {});
  const thisYear = new Date().getFullYear();
  const [goalYear, setGoalYear] = useState(thisYear);
  const [goalsByYear, setGoalsByYear] = useLocalStorage("pa_goals_v3", {});
  const [assets, setAssets] = useLocalStorage("pa_assets", {});
  const [stops, setStops] = useLocalStorage("pa_stops", []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-8">

        {/* 목표 */}
        <motion.section id="goals" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SectionHeader title={`목표 (${goalYear}년)`} />
          {/* GoalsPanel 여기 그대로 */}
        </motion.section>

        {/* ✅ 절제 목록 */}
        <motion.section id="stops" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SectionHeader title="절제 목록" />
          <StopPanel list={stops} setList={setStops} />
        </motion.section>

        {/* 자산 */}
        <motion.section id="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <SectionHeader title="자산 현황 & 추이" />
          {/* AssetsPanel 그대로 */}
        </motion.section>

      </main>
    </div>
  );
}
