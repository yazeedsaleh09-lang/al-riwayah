"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PreferenceControls } from "./PreferenceControls";
import styles from "./ApprovedHome.module.css";

const links = [
  { href: "/how-to-play", label: "كيف تلعب" },
  { href: "/cases", label: "القضية" },
  { href: "/about", label: "عن اللعبة" },
  { href: "/create", label: "ابدأ جلسة" },
  { href: "/join", label: "عندي رمز" },
] as const;

export function ApprovedMobileNav() {
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

    const closeOnEscape = (event: KeyboardEvent) => {
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
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={styles.mobileNav}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.mobileToggle}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "أغلق القائمة" : "افتح القائمة"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden>{open ? "×" : "☰"}</span>
      </button>
      {open && (
        <nav
          ref={menuRef}
          id="mobile-menu"
          className={styles.mobileMenu}
          aria-label="قائمة الجوال"
        >
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <PreferenceControls />
        </nav>
      )}
    </div>
  );
}
