'use client';

import { useState } from 'react';
import SupportModal from '@/components/SupportModal';

export default function SettingsHelpRow() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="row-action" style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center', padding:12 }}>
        <div>
        <div className="title">Report a bug or ask a question — we’ll email you back.</div>
        </div>

        {/* Left-aligned button per your style: put button in the first column if you want it left */}
        {/* Right now it's on the right; move it left by swapping the columns or removing grid. */}
        <div className="hstack" style={{ justifySelf:'start' }}>
          <button className="btn-primary" onClick={() => setOpen(true)}>Contact Support</button>
        </div>
      </div>

      <SupportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
