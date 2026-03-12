"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";

type MentionCandidate = {
  id: string;
  name: string | null;
  role: string | null;
};

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  disabled,
  className,
}: MentionTextareaProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MentionCandidate[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!query) {
      setItems([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/profiles/mentions?q=${encodeURIComponent(query)}`,
          { credentials: "include" },
        );
        const json = await res.json().catch(() => []);
        if (cancelled) return;
        if (!res.ok || !Array.isArray(json)) {
          setItems([]);
          setOpen(false);
          return;
        }
        setItems(json as MentionCandidate[]);
        setOpen(json.length > 0);
        setActiveIndex(0);
      } catch {
        if (!cancelled) {
          setItems([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const updateQueryFromValue = (next: string) => {
    const match = next.match(/@([^\s@]{1,20})$/);
    if (match) {
      setQuery(match[1]);
    } else {
      setQuery("");
      setOpen(false);
    }
  };

  const handleChange = (next: string) => {
    onChange(next);
    updateQueryFromValue(next);
  };

  const applyMention = (candidate: MentionCandidate) => {
    if (!candidate.name) return;
    const replaced = value.replace(
      /@([^\s@]{1,20})$/,
      `@${candidate.name} `,
    );
    onChange(replaced);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev === 0 ? items.length - 1 : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = items[activeIndex];
      if (target) applyMention(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        disabled={disabled}
        className={className}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover text-sm shadow-lg">
          {loading && items.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground">
              불러오는 중…
            </div>
          ) : (
            <>
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyMention(item)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-muted ${
                    index === activeIndex ? "bg-muted" : ""
                  }`}
                >
                  <span className="truncate">
                    @{item.name ?? "이름 없음"}
                  </span>
                  {item.role && (
                    <span className="ml-2 text-[11px] uppercase text-muted-foreground">
                      {item.role}
                    </span>
                  )}
                </button>
              ))}
              {!loading && items.length === 0 && (
                <div className="px-3 py-2 text-muted-foreground">
                  해당 이름의 사용자를 찾을 수 없습니다.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

