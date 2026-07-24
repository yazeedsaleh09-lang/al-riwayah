"use client";

import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "./Wordmark";
import { PreferenceControls } from "./PreferenceControls";
import { NAV_LINKS } from "@/lib/site";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-nav">
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
        </nav>
        <button
          className="site-nav__toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="visually-hidden">القائمة</span>
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="قائمة الجوال" className="site-nav__mobile">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link className="btn btn--evidence btn--full" href="/play" onClick={() => setOpen(false)}>
            ادخل برمز
          </Link>
        </nav>
      )}
    </header>
  );
}
