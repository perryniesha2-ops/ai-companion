'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ChatMenu() {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [open, setOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  // Focus first item when opening
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[data-menu-item]');
    first?.focus();
  }, [open]);

  // Keyboard on the toggle button
  function onButtonKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  // Keyboard navigation inside the menu
  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? []);
    const idx = items.findIndex((el) => el === document.activeElement);

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(idx + 1) % items.length];
      next?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(idx - 1 + items.length) % items.length];
      prev?.focus();
    }
  }

  async function handleSignOut() {
    await sb.auth.signOut();
    router.replace('/auth/login');
  }

  function goto(href: string) {
    setOpen(false);
    router.push(href);
  }

  function resetCompanion() {
    setOpen(false);
    // Route to the reset section in Companion panel (update anchor if you change it)
    router.push('/dashboard?tab=companion#reset');
  }

  function exportConversations() {
    setOpen(false);
    // Route to export action/section (adjust to your actual route)
    router.push('/dashboard?tab=companion#export');
  }

  return (
    <div className="menu-wrap" ref={wrapRef}>
      <button
        className="menu-btn"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
      >
        ≡
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="dropdown"
          onKeyDown={onMenuKeyDown}
        >
          <Link
            href="/dashboard"
            className="dropdown-item"
            role="menuitem"
            data-menu-item
            onClick={() => setOpen(false)}
          >
            📊 <span>Dashboard</span>
          </Link>

          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            data-menu-item
            onClick={() => goto('/dashboard?tab=companion')}
          >
            💖 <span>Companion</span>
          </button>

          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            data-menu-item
            onClick={() => goto('/dashboard?tab=billing')}
          >
            💳 <span>Billing</span>
          </button>

          <div className="dropdown-sep" />

          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            data-menu-item
            onClick={exportConversations}
          >
            ⬇️ <span>Export conversations</span>
          </button>

          <button
            type="button"
            className="dropdown-item danger"
            role="menuitem"
            data-menu-item
            onClick={resetCompanion}
          >
            🗑 <span>Reset companion</span>
          </button>

          <div className="dropdown-sep" />

          <button
            type="button"
            className="dropdown-item"
            role="menuitem"
            data-menu-item
            onClick={handleSignOut}
          >
            ↩︎ <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
