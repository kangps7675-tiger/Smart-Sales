"use client";

import { useState, useRef, useEffect } from "react";

const items = [
  { label: "To 대리점", href: "#features-dealer" },
  { label: "To 고객", href: "#features-customer" },
];

export function FeaturesNavDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-muted-foreground hover:text-foreground"
        aria-expanded={open}
        aria-haspopup="true"
      >
        기능
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-border bg-card py-1 shadow-md">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
