import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/** ──────────────────────────────────────────────────────────────────────────
 *  한국 공휴일(일/공휴일/대체공휴일) 2025~2026
 *  - 형식: YYYY-MM-DD
 *  - 선거일/정부 지정 임시공휴일은 해마다 달라 제외(추가되면 이 Set에 더 넣으면 됨)
 *  참고: timeanddate 2025/2026, time.is 2026 KR calendar, 대체공휴일 제도 안내
 *  ────────────────────────────────────────────────────────────────────────── */
const HOLIDAYS_KR = new Set<string>([
  /** 2025 */
  "2025-01-01",                // 신정
  "2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30", // 설연휴(전/당/익) + 연휴 확대
  "2025-03-01", "2025-03-03",  // 삼일절 + 대체(월)
  "2025-05-05", "2025-05-06",  // 어린이날(석가탄신일과 겹침), 대체(화)
  "2025-06-06",                // 현충일
  "2025-08-15",                // 광복절
  "2025-10-03",                // 개천절
  "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08", // 추석(일~화) + 대체(수)
  "2025-10-09",                // 한글날
  "2025-12-25",                // 성탄절

  /** 2026 */
  "2026-01-01",                // 신정
  "2026-02-16", "2026-02-17", "2026-02-18", // 설연휴(전/당/익)
  "2026-03-01", "2026-03-02",  // 삼일절 + 대체(월)
  "2026-05-05",                // 어린이날
  "2026-05-24", "2026-05-25",  // 석가탄신일(일), 대체(월)
  "2026-06-06",                // 현충일
  "2026-08-15", "2026-08-17",  // 광복절(토), 대체(월)
  "2026-09-24", "2026-09-25", "2026-09-26", // 추석(전/당/익)
  "2026-10-03", "2026-10-05",  // 개천절(토), 대체(월)
  "2026-10-09",                // 한글날
  "2026-12-25",                // 성탄절
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
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths    = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

// 억 단위 표시
const formatEok = (v?: number | null) => {
  if (v == null || isNaN(v)) return "-";
  const num = v / 1e8;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}억`;
};

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue] as const;
}

// ── UI atoms ──────────────────────────────────────────────────────
function Button({ children, variant="primary", onClick, href, type="button", className="" }:{
  children:any; variant?:"primary"|"secondary"|"ghost"; onClick?:any; href?:string; type?:"button"|"submit"|"reset"; className?:string;
}) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-2xl transition-colors focus:outline-none focus:ring-4 active:scale-[0.98] whitespace-nowrap";
  const styles: Record<string,string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200",
    secondary:"bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 focus:ring-gray-200",
    ghost:   "bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-100",
  };
  const Comp: any = href ? "a" : "button";
  return <Comp type={type} href={href} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>{children}</Comp>;
}
function Card({children,className=""}:{children:any;className?:string;}) {
  return <div className={`bg-white border border-gray-100 rounded-2xl shadow-lg ${className}`}>{children}</div>;
}
function Input({value,onChange,placeholder,type="text",className=""}:{value:any;onChange:(v:any)=>void;placeholder?:string;type?:string;className?:string;}) {
  return <input value={value} onChange={(e)=>onChange((e.target as HTMLInputElement).value)} placeholder={placeholder} type={type}
    className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-100 ${className}`} />;
}
function TextArea({value,onChange,placeholder,className=""}:{value:any;onChange:(v:any)=>void;placeholder?:string;className?:string;}) {
  return <textarea value={value} onChange={(e)=>onChange((e.target as HTMLTextAreaElement).value)} placeholder={placeholder}
    className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-4 focus:ring-indigo-100 ${className}`} rows={3} />;
}
function SectionHeader({eyebrow,title,action}:{eyebrow?:string;title:string;action?:any;}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
      <div>
        {eyebrow && <p className="text-indigo-600 text-sm font-medium uppercase tracking-wide">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ── Calendar + Todos (중요도 ★, 일/공휴일 빨간색) ────────────────
function Calendar({current,onPrev,onNext,selected,onSelect,todos}:{current:Date;onPrev:()=>void;onNext:()=>void;selected:Date|null;onSelect:(d:Date)=>void;todos:Record<string,any[]>;}) {
  const start = startOfMonth(current); const end = endOfMonth(current);
  const startWeekday = (start.getDay()+6)%7; const daysInMonth = end.getDate();

  const { countMap, starMap } = useMemo(()=>{
    const c:Record<string,number>={}, s:Record<string,number>={};
    Object.entries(todos||{}).forEach(([k, arr])=>{
      const list:any[] = Array.isArray(arr)?arr:[];
      c[k]=list.length; s[k]=list.reduce((m,it)=>Math.max(m,Number((it as any).stars)||0),0);
    });
    return {countMap:c, starMap:s};
  },[todos]);

  const days = useMemo(()=>{
    const arr:(Date|null)[]=[]; for(let i=0;i<startWeekday;i++) arr.push(null);
    for(let d=1; d<=daysInMonth; d++) arr.push(new Date(current.getFullYear(), current.getMonth(), d));
    while(arr.length%7!==0) arr.push(null); return arr;
  },[current]);

  const label = `${current.getFullYear()}년 ${String(current.getMonth()+1).padStart(2,"0")}월`;

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
        {["월","화","수","목","금","토","일"].map(w=><div key={w} className="py-2 font-semibold">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3 pb-3">
        {days.map((d,i)=>{
          const isSelected = d && selected && fmtDateKey(d)===fmtDateKey(selected);
          const key = d?fmtDateKey(d):null;
          const cnt = key ? (countMap[key]||0) : 0;
          const stars = key ? (starMap[key]||0) : 0;
          const dots = Array.from({length:Math.min(cnt,10)});

          // 일요일/공휴일 판별
          const isSunday = d ? d.getDay() === 0 : false; // Sun=0
          const isHoliday = d ? HOLIDAYS_KR.has(fmtDateKey(d)) : false;
          const dateColorClass = isSelected
            ? "text-white"
            : (isSunday || isHoliday) ? "text-red-500" : "text-gray-800";

          return (
            <button key={i} disabled={!d} onClick={()=>d&&onSelect(d)}
              className={`h-20 rounded-xl border text-sm flex flex-col items-center p-2 transition ${
                d ? (isSelected?"bg-indigo-600 text-white border-indigo-600":"bg-white hover:bg-indigo-50 border-gray-200")
                  : "bg-gray-50 border-transparent cursor-default"}`}>
              {/* 날짜 숫자 */}
              <span className={`self-end ${dateColorClass}`}>{d?d.getDate():""}</span>

              {/* 중요도 별(최대 3개) */}
              {d && <div className="mt-1 text-amber-500 text-xs">{"★".repeat(Math.min(stars,3))}</div>}
              {/* 할 일 개수 점표시 */}
              {d && <div className={`mt-auto mb-1 flex flex-wrap gap-1 justify-center ${isSelected?"text-white":"text-red-500"}`}>
                {dots.map((_,idx)=><span key={idx} className={`h-1.5 w-1.5 rounded-full ${isSelected?"bg-white":"bg-red-500"}`}></span>)}
              </div>}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TodoPanel({date,todos,setTodos}:{date:Date|null;todos:Record<string,any[]>;setTodos:(v:any)=>void;}) {
  const key = date?fmtDateKey(date):null;
  const [text,setText]=useState(""); const [stars,setStars]=useState(0);
  const dayTodos = useMemo(()=> (key&&todos[key])?todos[key]:[], [key,todos]);

  const add=()=>{ if(!key||!text.trim()) return;
    const item={id:crypto.randomUUID(), text:text.trim(), done:false, stars:Number(stars)||0};
    setTodos({...todos,[key]:[...dayTodos,item]}); setText(""); setStars(0);
  };
  const toggle=(id:string)=>{ const n:any={...todos};
    n[key!]=dayTodos.map((t:any)=>t.id===id?{...t,done:!t.done}:t); setTodos(n);
  };
  const setItemStars=(id:string,s:number)=>{ const n:any={...todos};
    n[key!]=dayTodos.map((t:any)=>t.id===id?{...t,stars:s}:t); setTodos(n);
  };
  const remove=(id:string)=>{ const n:any={...todos};
    n[key!]=dayTodos.filter((t:any)=>t.id!==id); setTodos(n);
  };

  const StarEdit=({value,onChange}:{value:number;onChange:(v:number)=>void;})=>(
    <div className="flex items-center gap-1">
      {[1,2,3].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)}
          className={`text-xs ${n<=value?"text-amber-500":"text-gray-300"}`}>★</button>
      ))}
      <button type="button" onClick={()=>onChange(0)} className="text-xs text-gray-400 ml-1">지우기</button>
    </div>
  );

  return (
    <Card>
      <div className="p-4 border-b border-gray-100">
        <div className="text-gray-900 font-semibold">{date?fmtDateKey(date):"날짜를 선택하세요"}</div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
          <Input value={text} onChange={setText} placeholder="할 일을 입력" className="sm:col-span-4" />
          <div className="sm:col-span-1 flex justify-start sm:justify-center"><StarEdit value={stars} onChange={setStars} /></div>
          <Button onClick={add} className="sm:col-span-1">추가</Button>
        </div>
        <ul className="space-y-2">
          {dayTodos.map((t:any)=>(
            <li key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} />
                <span className={`text-sm ${t.done?"line-through text-gray-400":"text-gray-800"}`}>{t.text}</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="text-amber-500 text-xs">{"★".repeat(Math.min(t.stars||0,3))}</div>
                <StarEdit value={t.stars||0} onChange={(v)=>setItemStars(t.id,v)} />
                <button onClick={()=>remove(t.id)} className="text-xs text-gray-500 hover:text-gray-800">삭제</button>
              </div>
            </li>
          ))}
          {dayTodos.length===0 && <div className="text-sm text-gray-500">할 일을 추가하세요.</div>}
        </ul>
      </div>
    </Card>
  );
}

// ── Goals (연도별, 우선순위 공란 허용) ────────────────────────────
const PRIORITY:Record<number,{label:string;icon:string}>={
  1:{label:"1순위",icon:"🔴"}, 2:{label:"2순위",icon:"🟠"}, 3:{label:"3순위",icon:"🟢"},
};
function GoalsPanel({goalsByYear,setGoalsByYear,year,setYear}:{goalsByYear:Record<string,any[]>;setGoalsByYear:(v:any)=>void;year:number;setYear:(f:(y:number)=>number)=>void;}) {
  const [title,setTitle]=useState(""); const [prio,setPrio]=useState("");
  const add=()=>{ if(!title.trim())return; const list=goalsByYear[year]||[];
    setGoalsByYear({...goalsByYear,[year]:[...list,{id:crypto.randomUUID(),title:title.trim(),done:false,prio:prio===""?undefined:Number(prio)}]});
    setTitle(""); setPrio("");
  };
  const toggle=(id:string)=>{ const list=goalsByYear[year]||[];
    setGoalsByYear({...goalsByYear,[year]:list.map((g:any)=>g.id===id?{...g,done:!g.done}:g)});
  };
  const remove=(id:string)=>{ const list=goalsByYear[year]||[];
    setGoalsByYear({...goalsByYear,[year]:list.filter((g:any)=>g.id!==id)});
  };
  const changePrio=(id:string,p:string)=>{ const list=goalsByYear[year]||[];
    setGoalsByYear({...goalsByYear,[year]:list.map((g:any)=>g.id===id?{...g,prio:p===""?undefined:Number(p)}:g)});
  };
  const list=(goalsByYear[year]||[]).sort((a:any,b:any)=>(a.prio??99)-(b.prio??99));

  return (
    <Card>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="font-semibold text-gray-900">목표 (연도별)</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={()=>setYear((y)=>y-1)}>이전년도</Button>
          <div className="text-gray-900 font-semibold">{year}년</div>
          <Button variant="secondary" onClick={()=>setYear((y)=>y+1)}>다음년도</Button>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <Input value={title} onChange={setTitle} placeholder={`${year}년 목표 제목`} className="flex-1"/>
          <select value={prio} onChange={(e)=>setPrio(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value=""></option>
            <option value="1">1순위 🔴</option>
            <option value="2">2순위 🟠</option>
            <option value="3">3순위 🟢</option>
          </select>
          <Button onClick={add}>추가</Button>
        </div>
        <div className="space-y-2">
          {list.map((g:any)=>(
            <div key={g.id} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={g.done} onChange={()=>toggle(g.id)} />
                <span className={`text-sm ${g.done?"line-through text-gray-400":"text-gray-800"}`}>
                  {g.prio ? <span className="mr-1">{PRIORITY[g.prio]?.icon}</span> : null}
                  {g.title}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <select value={g.prio ?? ""} onChange={(e)=>changePrio(g.id, e.target.value)} className="rounded-xl border border-gray-200 px-2 py-1 text-xs">
                  <option value=""></option>
                  <option value={1}>1순위 🔴</option>
                  <option value={2}>2순위 🟠</option>
                  <option value={3}>3순위 🟢</option>
                </select>
                <button onClick={()=>remove(g.id)} className="text-xs text-gray-500 hover:text-gray-800">삭제</button>
              </div>
            </div>
          ))}
          {list.length===0 && <div className="text-sm text-gray-500">{year}년 목표를 추가해 보세요.</div>}
        </div>
      </div>
    </Card>
  );
}

// ── Assets (PIN 잠금, 12개월 롤링, 사유, 억단위 차트) ──────────────
function AssetsPanel({assets,setAssets}:{assets:Record<string,any>;setAssets:(v:any)=>void;}) {
  const now=new Date();
  const [anchor,setAnchor]=useState(monthLabel(now.getFullYear(), now.getMonth()));
  const [month,setMonth]=useState(anchor);
  const [assetName,setAssetName]=useState(""); const [amount,setAmount]=useState(0);
  const [noteUp,setNoteUp]=useState(""); const [noteDown,setNoteDown]=useState("");

  const [pin,setPin]=useLocalStorage("pa_assets_pin",""); const [inputPin,setInputPin]=useState("");
  const [unlocked,setUnlocked]=useState(pin===""); const [pinError,setPinError]=useState("");

  const tryUnlock=()=>{ if(!pin){setUnlocked(true);return;}
    if(inputPin===pin){setUnlocked(true);setPinError("");} else setPinError("PIN이 올바르지 않습니다.");
  };
  const setNewPin=()=>{ const v=prompt("새 PIN(숫자) 설정 — 빈 값이면 잠금 해제 상태");
    if(v!==null){ setPin(String(v)); setUnlocked(String(v)===""); setPinError(""); }
  };
  const lockNow=()=>{ if(pin){setUnlocked(false);setPinError("");} else alert("먼저 PIN을 설정하세요."); };

  // 구형 스키마 마이그레이션
  useEffect(()=>{ let changed=false; const next:any={...assets};
    Object.entries(next).forEach(([k,v])=>{ if(v!=null && typeof v==="number"){
      next[k]={items:[{id:crypto.randomUUID(), name:"총액", amount:Number(v)}]}; changed=true; }});
    if(changed) setAssets(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const parseMonth=(m:string)=>{ const [y,mm]=m.split("-").map(Number); return new Date(y, mm-1, 1); };
  const shiftAnchor=(delta:number)=>{ const d=addMonths(parseMonth(anchor), delta); setAnchor(monthLabel(d.getFullYear(), d.getMonth())); };

  const monthsWindow=useMemo(()=>{ const s=parseMonth(anchor);
    return Array.from({length:12},(_,i)=>monthLabel(addMonths(s,i).getFullYear(), addMonths(s,i).getMonth()));
  },[anchor]);

  const totalsByMonth=useMemo(()=>{ const obj:Record<string,number>={};
    monthsWindow.forEach(m=>{ const items=assets[m]?.items||[]; obj[m]=items.reduce((sum:number,it:any)=>sum+(Number(it.amount)||0),0); });
    return obj;
  },[assets,monthsWindow]);

  const chartData = monthsWindow.map(m=>({month:m,total:totalsByMonth[m]??null}));

  const rows=useMemo(()=> monthsWindow
    .filter(m=>assets[m])
    .map(m=>({month:m, items:assets[m].items, total:totalsByMonth[m], noteUp:assets[m].noteUp||"", noteDown:assets[m].noteDown||""}))
    .sort((a,b)=>a.month<b.month?-1:1)
  ,[assets,monthsWindow,totalsByMonth]);

  const addItem=()=>{ if(!month||!assetName.trim()||isNaN(Number(amount))) return;
    const entry=assets[month]||{items:[], noteUp:"", noteDown:""};
    const items=[...entry.items, {id:crypto.randomUUID(), name:assetName.trim(), amount:Number(amount)}];
    setAssets({...assets, [month]:{...entry, items}}); setAssetName(""); setAmount(0);
  };
  const saveNotes=()=>{ if(!month) return; const entry=assets[month]||{items:[]}; setAssets({...assets, [month]:{...entry, noteUp, noteDown}}); };
  const removeItem=(m:string,id:string)=>{ const entry=assets[m]; if(!entry) return;
    const items=entry.items.filter((it:any)=>it.id!==id); const next:any={...assets};
    if(items.length===0) delete next[m]; else next[m]={...entry, items}; setAssets(next);
  };

  if(!unlocked){
    return (
      <Card>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-gray-900">자산 현황 & 추이 (보호됨)</div>
          <Button variant="secondary" onClick={setNewPin}>PIN 변경</Button>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-center gap-2">
          <Input value={inputPin} onChange={setInputPin} placeholder="PIN 입력" className="max-w-xs" />
          <Button onClick={tryUnlock}>열기</Button>
          {pinError && <div className="text-xs text-red-500">{pinError}</div>}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold text-gray-900">자산 현황 & 추이 (월별)</div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" onClick={()=>shiftAnchor(-1)}>◀︎</Button>
          <div className="text-sm text-gray-700">시작: {anchor}</div>
          <Button variant="secondary" onClick={()=>shiftAnchor(1)}>▶︎</Button>
          <Button variant="ghost" onClick={setNewPin}>PIN 설정/변경</Button>
          <Button variant="ghost" onClick={lockNow}>잠금</Button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatEok} />
              <Tooltip content={({active,payload,label}:any)=>{
                if(!active||!payload?.length) return null;
                const v=payload[0].value; const up=assets[label]?.noteUp; const down=assets[label]?.noteDown;
                return (
                  <div className="bg-white/95 border border-gray-200 rounded-xl shadow p-2 text-sm">
                    <div className="font-semibold text-gray-900">{label}</div>
                    <div className="text-gray-800">총액: {formatEok(v)}</div>
                    {(up||down)&&(
                      <div className="mt-1 text-xs text-gray-600 space-y-1">
                        {up && <div>⬆️ {up}</div>}
                        {down && <div>⬇️ {down}</div>}
                      </div>
                    )}
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <ul className="space-y-3">
            {rows.map((r)=>(
              <li key={r.month} className="p-3 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{r.month}</div>
                  <div className="text-sm font-semibold text-gray-900">{formatEok(r.total)}</div>
                </div>
                <ul className="mt-2 space-y-1">
                  {r.items.map((it:any)=>(
                    <li key={it.id} className="flex items-center justify-between text-sm text-gray-700">
                      <span>{it.name}</span>
                      <span>{new Intl.NumberFormat().format(it.amount)}</span>
                      <button onClick={()=>removeItem(r.month, it.id)} className="text-xs text-gray-500 hover:text-gray-800">삭제</button>
                    </li>
                  ))}
                </ul>
                {(r.noteUp||r.noteDown)&&(
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    {r.noteUp && <div>⬆️ 증가 사유: {r.noteUp}</div>}
                    {r.noteDown && <div>⬇️ 감소 사유: {r.noteDown}</div>}
                  </div>
                )}
              </li>
            ))}
            {rows.length===0 && <div className="text-sm text-gray-500">내역이 없습니다.</div>}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input value={month} onChange={setMonth} placeholder="YYYY-MM" />
          <Input value={assetName} onChange={setAssetName} placeholder="자산명 (현금/주식/코인 등)" />
          <Input type="number" value={amount} onChange={setAmount} placeholder="금액" />
          <Button onClick={addItem}>항목 추가</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TextArea value={noteUp} onChange={setNoteUp} placeholder={`${month} 증가 사유`} />
          <TextArea value={noteDown} onChange={setNoteDown} placeholder={`${month} 감소 사유`} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={saveNotes}>사유 저장</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Free Board (관리자 PIN 삭제 권한) ────────────────────────────
function Board(){
  const [posts,setPosts]=useLocalStorage("pa_board",[] as any[]);
  const [title,setTitle]=useState(""); const [content,setContent]=useState(""); const [author,setAuthor]=useState("");

  const [adminPin,setAdminPin]=useLocalStorage("pa_board_admin_pin","");
  const [adminInput,setAdminInput]=useState(""); const [adminUnlocked,setAdminUnlocked]=useState(adminPin==="");
  const setNewAdminPin=()=>{ const v=prompt("자유게시판 관리자 PIN 설정 — 빈 값이면 잠금 해제");
    if(v!==null){ setAdminPin(String(v)); setAdminUnlocked(String(v)===""); }
  };
  const adminUnlock=()=>{ if(!adminPin){setAdminUnlocked(true);return;}
    if(adminInput===adminPin) setAdminUnlocked(true); else alert("관리자 PIN이 올바르지 않습니다");
  };

  const add=()=>{ if(!title.trim()&&!content.trim()) return;
    setPosts([{id:crypto.randomUUID(), title:title.trim(), content:content.trim(), author:author.trim()||"익명", ts:Date.now()}, ...posts]);
    setTitle(""); setContent(""); setAuthor("");
  };
  const del=(id:string)=>{ if(!adminUnlocked) return; setPosts(posts.filter((p:any)=>p.id!==id)); };

  return (
    <Card>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="font-semibold text-gray-900">자유게시판</div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Button variant="ghost" onClick={setNewAdminPin}>관리자 PIN</Button>
          {!adminUnlocked && (<>
            <Input value={adminInput} onChange={setAdminInput} placeholder="PIN" className="max-w-[120px]" />
            <Button onClick={adminUnlock}>해제</Button>
          </>)}
          {adminUnlocked && <span className="text-emerald-600">관리자 모드</span>}
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
          <Input value={author} onChange={setAuthor} placeholder="작성자" className="sm:col-span-1" />
          <Input value={title} onChange={setTitle} placeholder="제목" className="sm:col-span-2" />
          <Input value={content} onChange={setContent} placeholder="내용" className="sm:col-span-2" />
          <Button onClick={add}>등록</Button>
        </div>
        <ul className="space-y-2">
          {posts.map((p:any)=>(
            <li key={p.id} className="p-3 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900 truncate">{p.title || "(제목 없음)"}<span className="ml-2 text-xs text-gray-500">- {p.author || "익명"}</span></div>
                {adminUnlocked && <button onClick={()=>del(p.id)} className="text-xs text-gray-500 hover:text-gray-800">삭제</button>}
              </div>
              {p.content && <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{p.content}</div>}
              <div className="mt-1 text-xs text-gray-400">{new Date(p.ts).toLocaleString()}</div>
            </li>
          ))}
          {posts.length===0 && <div className="text-sm text-gray-500">게시글이 없습니다.</div>}
        </ul>
      </div>
    </Card>
  );
}

// ── App ───────────────────────────────────────────────────────────
export default function App(){
  const [currentMonth,setCurrentMonth]=useState(new Date());
  const [selectedDate,setSelectedDate]=useState<Date|null>(new Date());
  const [todos,setTodos]=useLocalStorage("pa_todos",{} as Record<string,any[]>);
  const thisYear=new Date().getFullYear();
  const [goalYear,setGoalYear]==useState(thisYear);
  const [goalsByYear,setGoalsByYear]=useLocalStorage("pa_goals_v3",{} as Record<string,any[]>);
  const [assets,setAssets]=useLocalStorage("pa_assets",{} as Record<string,any>);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-600" />
            <span className="font-semibold">My Assistant · Journal</span>
          </div>
          <nav className="hidden sm:flex items-center gap-2">
            <Button variant="ghost" href="#calendar">캘린더</Button>
            <Button variant="ghost" href="#goals">목표</Button>
            <Button variant="ghost" href="#assets">자산</Button>
            <Button variant="ghost" href="#board">게시판</Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={()=>setSelectedDate(new Date())}>오늘</Button>
          </div>
        </div>
        <div className="sm:hidden overflow-x-auto px-3 pb-2 flex gap-2">
          <Button variant="ghost" href="#calendar" className="shrink-0">캘린더</Button>
          <Button variant="ghost" href="#goals" className="shrink-0">목표</Button>
          <Button variant="ghost" href="#assets" className="shrink-0">자산</Button>
          <Button variant="ghost" href="#board" className="shrink-0">게시판</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-8">
        <motion.section id="today" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.35}}>
          <Card>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-indigo-600 font-medium uppercase tracking-wide">Today</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{fmtDateKey(new Date())}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={()=>setSelectedDate(new Date())}>오늘 할 일</Button>
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.section id="calendar" initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.35}}>
          <SectionHeader eyebrow="This Month" title="이번달 할 일" />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Calendar current={currentMonth} onPrev={()=>setCurrentMonth(addMonths(currentMonth,-1))} onNext={()=>setCurrentMonth(addMonths(currentMonth,1))}
              selected={selectedDate} onSelect={setSelectedDate} todos={todos} />
            <TodoPanel date={selectedDate} todos={todos} setTodos={setTodos} />
          </div>
        </motion.section>

        <motion.section id="goals" initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.35}}>
          <SectionHeader eyebrow="Goals" title={`목표 (연도별) — ${goalYear}년`} />
          <div className="mt-4">
            <GoalsPanel goalsByYear={goalsByYear} setGoalsByYear={setGoalsByYear} year={goalYear} setYear={setGoalYear} />
          </div>
        </motion.section>

        <motion.section id="assets" initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.35}}>
          <SectionHeader eyebrow="Assets" title="자산 현황 & 추이 (연속 12개월)" />
          <div className="mt-4">
            <AssetsPanel assets={assets} setAssets={setAssets} />
          </div>
        </motion.section>

        <motion.section id="board" initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.35}}>
          <SectionHeader eyebrow="Community" title="자유게시판" />
          <div className="mt-4">
            <Board />
          </div>
        </motion.section>
      </main>
    </div>
  );
}
