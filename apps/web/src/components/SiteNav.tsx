"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./Wordmark";
import { NAV_LINKS } from "@/lib/site";

const ACTION_LINKS = [
  { href: "/create", label: "ابدأ جلسة", className: "site-nav__primary" },
  { href: "/play", label: "عندي رمز", className: "site-nav__secondary" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    );
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => focusable?.[0]?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <header className="site-nav" id="top">
      <div className="site-nav__row">
        <Wordmark />
        <nav aria-label="التنقل الرئيسي" className="site-nav__links">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="site-nav__actions">
          {ACTION_LINKS.map((action) => (
            <Link key={action.href} className={action.className} href={action.href}>
              {action.label}
            </Link>
          ))}
        </div>
        <button
          ref={toggleRef}
          type="button"
          className="site-nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "أغلق القائمة" : "افتح القائمة"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="visually-hidden">القائمة</span>
          <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none">
            {open ? (
              <>
                <path d="M5 5 19 19" stroke="currentColor" strokeWidth="1.8" />
                <path d="m19 5-14 14" stroke="currentColor" strokeWidth="1.8" />
              </>
            ) : (
              <>
                <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 12h16" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 17h10" stroke="currentColor" strokeWidth="1.8" />
              </>
            )}
          </svg>
        </button>
      </div>
      {open && (
        <nav
          ref={menuRef}
          id="mobile-menu"
          aria-label="قائمة الجوال"
          className="site-nav__mobile"
        >
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={closeMenu}>
              {l.label}
            </Link>
          ))}
          {ACTION_LINKS.map((action) => (
            <Link
              key={action.href}
              className={action.className}
              href={action.href}
              onClick={closeMenu}
            >
              {action.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
