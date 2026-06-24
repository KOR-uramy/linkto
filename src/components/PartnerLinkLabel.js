'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';
import {
  getPartnerLinkUrlFallback,
  resolvePartnerLinkDisplayLabel,
} from '../lib/partner-link-label';

function getDisplayLabel(storedLabel, url, fetchedLabel = '') {
  return (
    resolvePartnerLinkDisplayLabel(storedLabel, url, fetchedLabel) ||
    getPartnerLinkUrlFallback(url)
  );
}

export default function PartnerLinkLabel({ url, storedLabel, className = '' }) {
  const [label, setLabel] = useState(() => getDisplayLabel(storedLabel, url));

  useEffect(() => {
    setLabel(getDisplayLabel(storedLabel, url));

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
        const nextLabel = getDisplayLabel(storedLabel, url, data.title || '');
        if (!cancelled && nextLabel) {
          setLabel(nextLabel);
        }
      } catch {
        // stored label 유지
      }
    };

    loadTitle();
    return () => {
      cancelled = true;
    };
  }, [url, storedLabel]);

  return <span className={className || undefined}>{label}</span>;
}
