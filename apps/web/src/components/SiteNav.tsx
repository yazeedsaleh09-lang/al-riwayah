"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./Wordmark";
import { PreferenceControls } from "./PreferenceControls";
import { NAV_LINKS } from "@/lib/site";

export function SiteNav({ variant = "default" }: { variant?: "default" | "golden" }) {
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
    focusable?.[0]?.focus();

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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  if (variant === "golden") {
    return (
      <header className="site-nav site-nav--golden" id="top">
        <div className="container site-nav__row">
          <Wordmark variant="golden" />
          <nav aria-label="التنقل الرئيسي" className="site-nav__desktop">
            <Link href="/how-to-play">كيف تلعب</Link>
            <Link href="/cases">القضية</Link>
            <Link href="/about">عن اللعبة</Link>
            <Link className="btn btn--evidence site-nav__cta" href="/create">
              ابدأ جلسة
            </Link>
            <Link className="btn btn--ghost site-nav__code" href="/join">
              عندي رمز
            </Link>
          </nav>
          <button
            ref={toggleRef}
            className="site-nav__toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "أغلق القائمة" : "افتح القائمة"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="visually-hidden">القائمة</span>
            <svg aria-hidden viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.8" />
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
            <Link href="/how-to-play" onClick={closeMenu}>
              كيف تلعب
            </Link>
            <Link href="/cases" onClick={closeMenu}>
              القضية
            </Link>
            <Link href="/about" onClick={closeMenu}>
              عن اللعبة
            </Link>
            <PreferenceControls />
            <Link className="btn btn--evidence btn--full" href="/create" onClick={closeMenu}>
              ابدأ جلسة
            </Link>
          </nav>
        )}
      </header>
    );
  }

  return (
    <header className="site-nav" id="top">
      <div className="container site-nav__row">
        <Wordmark />
        <nav aria-label="التنقل الرئيسي" className="site-nav__desktop">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <PreferenceControls />
          <Link className="btn btn--evidence site-nav__cta" href="/create">
            أنشئ غرفة
          </Link>
          <Link className="btn btn--ghost site-nav__code" href="/join">
            عندي رمز
          </Link>
        </nav>
        <button
          ref={toggleRef}
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
          <PreferenceControls />
          <Link className="btn btn--evidence btn--full" href="/create" onClick={closeMenu}>
            أنشئ غرفة
          </Link>
          <Link className="btn btn--ghost btn--full" href="/join" onClick={closeMenu}>
            ادخل برمز
          </Link>
        </nav>
      )}
    </header>
  );
}
