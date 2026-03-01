"use client";

/**
 * 캘린더 페이지
 * - 연·월 드롭다운 (과거·미래 포함), 28/29/30/31일 변동 반영
 * - 일자별 투두: 추가·수정·저장·삭제·강조 3단계
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getKoreanHolidayMapForYear } from "@/lib/korean-holidays";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type CalendarTodo = {
  id: string;
  profile_id: string;
  todo_date: string;
  content: string;
  highlight: number;
  created_at: string;
  updated_at: string;
};

type CalendarLeave = { leave_date: string; label: string };

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [todos, setTodos] = useState<CalendarTodo[]>([]);
  const [leaveList, setLeaveList] = useState<CalendarLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newHighlight, setNewHighlight] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editHighlight, setEditHighlight] = useState(0);

  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const firstDay = useMemo(() => getFirstDayOfWeek(year, month), [year, month]);

  const yearOptions = useMemo(() => {
    const min = today.getFullYear() - 2;
    const max = 2050;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [today]);

  const calendarCells = useMemo(() => {
    const cells: { type: "empty" | "day"; day?: number; dateStr?: string }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ type: "empty" });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ type: "day", day: d, dateStr });
    }
    return cells;
  }, [year, month, daysInMonth, firstDay]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, CalendarTodo[]>();
    for (const t of todos) {
      const d = (t.todo_date ?? "").slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return map;
  }, [todos]);

  const holidayMap = useMemo(() => getKoreanHolidayMapForYear(year), [year]);

  const leaveByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leaveList) {
      const d = (l.leave_date ?? "").slice(0, 10);
      map.set(d, l.label ?? "휴가");
    }
    return map;
  }, [leaveList]);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todosRes, leaveRes] = await Promise.all([
        fetch(`/api/calendar/todos?year=${year}&month=${month}`, { credentials: "include" }),
        fetch(`/api/calendar/leave?year=${year}&month=${month}`, { credentials: "include" }),
      ]);
      if (!todosRes.ok) throw new Error("투두를 불러올 수 없습니다.");
      const todosData = await todosRes.json();
      setTodos(Array.isArray(todosData) ? todosData : []);
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        setLeaveList(Array.isArray(leaveData) ? leaveData : []);
      } else {
        setLeaveList([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
      setTodos([]);
      setLeaveList([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const toggleLeave = useCallback(async (dateStr: string) => {
    const isLeave = leaveByDate.has(dateStr);
    try {
      if (isLeave) {
        const res = await fetch(`/api/calendar/leave?date=${dateStr}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error("휴가 해제 실패");
        setLeaveList((prev) => prev.filter((l) => (l.leave_date ?? "").slice(0, 10) !== dateStr));
      } else {
        const res = await fetch("/api/calendar/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ leave_date: dateStr, label: "휴가" }),
        });
        if (!res.ok) throw new Error("휴가 설정 실패");
        setLeaveList((prev) => [...prev.filter((l) => (l.leave_date ?? "").slice(0, 10) !== dateStr), { leave_date: dateStr, label: "휴가" }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "휴가 설정 오류");
    }
  }, [leaveByDate]);

  const addTodo = async (dateStr: string, closeAfter = false) => {
    const content = newContent.trim();
    if (!content) return;
    try {
      const res = await fetch("/api/calendar/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ todo_date: dateStr, content, highlight: newHighlight }),
      });
      if (!res.ok) throw new Error("추가 실패");
      setNewContent("");
      setNewHighlight(0);
      if (closeAfter) setAddingDate(null);
      await fetchTodos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가 실패");
    }
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/calendar/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editContent, highlight: editHighlight }),
      });
      if (!res.ok) throw new Error("수정 실패");
      setEditingId(null);
      await fetchTodos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    }
  };

  const deleteTodo = async (id: string) => {
    if (!confirm("이 투두를 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/calendar/todos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("삭제 실패");
      await fetchTodos();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  /** 형광펜으로 그은 듯한 반투명 강조 (1=빨강, 2=노랑, 3=초록) */
  const highlightClass = (h: number) => {
    if (h === 1) return "bg-rose-300/50 dark:bg-rose-500/40 border border-rose-300/40 dark:border-rose-500/30";
    if (h === 2) return "bg-amber-300/55 dark:bg-amber-400/40 border border-amber-300/40 dark:border-amber-400/30";
    if (h === 3) return "bg-emerald-300/50 dark:bg-emerald-500/40 border border-emerald-300/40 dark:border-emerald-500/30";
    return "bg-muted/30 border border-border/50";
  };

  /** 강조 색 선택 버튼용 (형광펜 색 미리보기) */
  const highlightSwatchClass = (h: number) => {
    if (h === 1) return "bg-rose-300/70 dark:bg-rose-500/60";
    if (h === 2) return "bg-amber-300/70 dark:bg-amber-400/60";
    if (h === 3) return "bg-emerald-300/70 dark:bg-emerald-500/60";
    return "bg-muted/50";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">캘린더</h1>
          <p className="mt-2 text-muted-foreground">
            연·월을 선택하고 각 일자에 할 일을 여러 줄로 적고, 휴가를 표시할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{year}년 {month}월</CardTitle>
          <CardDescription>
            + 로 할 일 추가(여러 줄 가능), 휴가 버튼으로 해당 날 휴가 설정/해제, 수정·삭제·강조 가능.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-px border border-border/60 bg-border/40 text-sm">
                {WEEKDAYS.map((wd, i) => (
                  <div
                    key={wd}
                    className={`bg-muted/60 px-2 py-2 text-center font-medium ${
                      i === 0 ? "text-red-600 dark:text-red-400" : i === 6 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                    }`}
                  >
                    {wd}
                  </div>
                ))}
                {calendarCells.map((cell, idx) => {
                  if (cell.type === "empty") {
                    return <div key={`e-${idx}`} className="min-h-[100px] bg-muted/20" />;
                  }
                  const dateStr = cell.dateStr!;
                  const dayTodos = todosByDate.get(dateStr) ?? [];
                  const isAdding = addingDate === dateStr;
                  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
                  const dayNumColorClass =
                    dayOfWeek === 0 ? "text-red-600 dark:text-red-400" : dayOfWeek === 6 ? "text-blue-600 dark:text-blue-400" : "text-foreground";
                  const holidayNames = holidayMap.get(dateStr) ?? [];
                  const isLeave = leaveByDate.has(dateStr);
                  const leaveLabel = leaveByDate.get(dateStr);

                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[100px] flex flex-col border-b border-r border-border/40 p-1.5 ${
                        isLeave ? "bg-sky-50/90 dark:bg-sky-950/30" : holidayNames.length ? "bg-amber-50/80 dark:bg-amber-950/20" : "bg-background"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-0.5">
                        <span className={`tabular-nums font-medium ${dayNumColorClass}`}>{cell.day}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => toggleLeave(dateStr)}
                            className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                              isLeave
                                ? "bg-sky-200 text-sky-800 dark:bg-sky-700 dark:text-sky-200"
                                : "bg-muted/70 text-muted-foreground hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-900/50 dark:hover:text-sky-300"
                            }`}
                            title={isLeave ? "휴가 해제" : "휴가로 설정"}
                          >
                            휴가
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setAddingDate(isAdding ? null : dateStr);
                              setNewContent("");
                              setNewHighlight(0);
                            }}
                            title="할 일 추가"
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      {isLeave && (
                        <p className="mb-0.5 truncate text-[10px] text-sky-600 dark:text-sky-400" title={leaveLabel}>
                          {leaveLabel}
                        </p>
                      )}
                      {holidayNames.length > 0 && (
                        <p className="mb-1 truncate text-[10px] text-amber-700 dark:text-amber-400" title={holidayNames.join(", ")}>
                          {holidayNames.join(", ")}
                        </p>
                      )}
                      <div className="flex-1 space-y-1 overflow-y-auto">
                        {dayTodos.map((t) => (
                          <div
                            key={t.id}
                            className={`rounded border px-2 py-1 text-xs ${highlightClass(t.highlight)}`}
                          >
                            {editingId === t.id ? (
                              <div className="space-y-1">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="min-h-[60px] text-xs"
                                  placeholder="내용 (여러 줄 가능)"
                                  rows={3}
                                />
                                <div className="flex items-center gap-1">
                                  {[0, 1, 2, 3].map((h) => (
                                    <button
                                      key={h}
                                      type="button"
                                      title={h === 0 ? "없음" : `강조 ${h}`}
                                      onClick={() => setEditHighlight(h)}
                                      className={`h-5 w-5 rounded border border-border/50 ${editHighlight === h ? "ring-2 ring-primary" : ""} ${highlightSwatchClass(h)}`}
                                    />
                                  ))}
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-6 text-xs" onClick={() => saveEdit(t.id)}>
                                    저장
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="break-words whitespace-pre-wrap text-xs">{t.content || "—"}</p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1 text-xs"
                                    onClick={() => {
                                      setEditingId(t.id);
                                      setEditContent(t.content);
                                      setEditHighlight(t.highlight);
                                    }}
                                  >
                                    수정
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1 text-xs text-destructive hover:text-destructive"
                                    onClick={() => deleteTodo(t.id)}
                                  >
                                    삭제
                                  </Button>
                                  {[1, 2, 3].map((h) => (
                                    <button
                                      key={h}
                                      type="button"
                                      title={`강조 ${h}`}
                                      onClick={async () => {
                                        const res = await fetch(`/api/calendar/todos/${t.id}`, {
                                          method: "PATCH",
                                          headers: { "Content-Type": "application/json" },
                                          credentials: "include",
                                          body: JSON.stringify({ content: t.content, highlight: t.highlight === h ? 0 : h }),
                                        });
                                        if (res.ok) await fetchTodos();
                                      }}
                                      className={`h-5 w-5 rounded border border-border/50 ${t.highlight === h ? "ring-2 ring-primary" : ""} ${highlightSwatchClass(h)}`}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        {isAdding && (
                          <div className="rounded border border-dashed border-border/60 bg-muted/30 p-1.5">
                            <Textarea
                              value={newContent}
                              onChange={(e) => setNewContent(e.target.value)}
                              placeholder="할 일 여러 줄 입력 (엔터로 줄바꿈)"
                              className="mb-1 min-h-[52px] text-xs"
                              rows={3}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setAddingDate(null);
                              }}
                            />
                            <div className="mb-1 flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">강조:</span>
                              {[0, 1, 2, 3].map((h) => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setNewHighlight(h)}
                                  className={`h-4 w-4 rounded border border-border/50 ${newHighlight === h ? "ring-2 ring-primary" : ""} ${highlightSwatchClass(h)}`}
                                />
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <Button size="sm" className="h-6 text-xs" onClick={() => addTodo(dateStr, false)} disabled={!newContent.trim()}>
                                저장 후 더 쓰기
                              </Button>
                              <Button size="sm" variant="secondary" className="h-6 text-xs" onClick={() => addTodo(dateStr, true)} disabled={!newContent.trim()}>
                                저장 후 닫기
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setAddingDate(null)}>
                                취소
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                강조: 빨강(1) · 노랑(2) · 초록(3). 휴가로 표시한 날은 하늘색으로 표시됩니다.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
