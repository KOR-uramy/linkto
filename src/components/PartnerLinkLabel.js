'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';
import {
  cleanPartnerLinkLabel,
  getInitialPartnerLinkLabel,
  getPartnerLinkFallbackLabel,
} from '../lib/partner-link-label';

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
        const fetched = cleanPartnerLinkLabel(data.title, url);
        const fallback = getPartnerLinkFallbackLabel(url);
        if (!cancelled && fetched && fetched !== fallback) {
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
