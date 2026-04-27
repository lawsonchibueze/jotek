'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    const btn = document.getElementById('print-btn');
    if (btn) btn.addEventListener('click', () => window.print());
    return () => {
      if (btn) btn.replaceWith(btn.cloneNode(true));
    };
  }, []);

  return null;
}
