'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';
import { getInitialPartnerLinkLabel } from '../lib/partner-link-label';

export default function PartnerLinkLabel({ url, storedLabel, className = '' }) {
  const [label, setLabel] = useState(() => getInitialPartnerLinkLabel(storedLabel, url));

  useEffect(() => {
    const initial = getInitialPartnerLinkLabel(storedLabel, url);
    setLabel(initial);

    if (!url) {
      return undefined;
    }

    let cancelled = false;

    const loadTitle = async () => {
      try {
        const res = await fetch(apiUrl(`/api/partner-title?url=${encodeURIComponent(url)}`));
        if (!res.ok || cancelled) {
          return;
        }

        const data = await res.json();
        const fetched = data.title?.trim();
        if (!cancelled && fetched) {
          setLabel(fetched);
        }
      } catch {
        // stored/fallback label 유지
      }
    };

    loadTitle();
    return () => {
      cancelled = true;
    };
  }, [url, storedLabel]);

  return <span className={className || undefined}>{label}</span>;
}
