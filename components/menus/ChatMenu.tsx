'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ChatMenu() {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);


  

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);



  async function handleSignOut() {
    await sb.auth.signOut();
    router.replace('/auth/login');
  }



   function goto(href: string) {
    setOpen(false);
    router.push(href);
  }

   function exportConversations() {
    setOpen(false);
    // Route to export action/section (adjust to your actual route)
    router.push('/dashboard?tab=companion#export');
  }

  return (
    <div className="input-group mb-3" ref={ref}>
      <button
        className="btn-primary"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        Back ▾
      </button>

      {open && (
        <div className="dropdown-menu" role="menu" style={{ position:'absolute', zIndex:10 }}>
          <button className="dropdown-item" role="menuitem"  onClick={() => goto('/dashboard?tab=companion')}>Dashboard</button>
          <button className="dropdown-item" role="menuitem" onClick={() => goto('/dashboard?tab=billing')}>Billing</button>
          <button className="dropdown-item" role="menuitem"  onClick={exportConversations}>Export Conversations</button>
          <hr className="dropdown-divider" />
          <button className="dropdown-item" role="menuitem"  onClick={handleSignOut}>Sign Out</button>
        </div>
      )}

      <input type="text" className="input" aria-label="Text input with dropdown button" />
    </div>
  );
}
