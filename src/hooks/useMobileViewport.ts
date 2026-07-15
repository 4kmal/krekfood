import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 1023px)';

function getInitialMobileMatch() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
}

export function useMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(getInitialMobileMatch);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const updateMatch = () => setIsMobileViewport(mediaQuery.matches);

    updateMatch();
    mediaQuery.addEventListener('change', updateMatch);
    return () => mediaQuery.removeEventListener('change', updateMatch);
  }, []);

  return isMobileViewport;
}
