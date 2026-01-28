import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../telemetry';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/login': 'Login',
  '/income': 'Income',
  '/expenses': 'Expenses',
  '/daily-expenses': 'Daily Expenses',
  '/investments': 'Investments',
  '/assets': 'Assets',
  '/settings': 'Settings',
};

/**
 * Hook to track page views when route changes
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    const pageName = routeNames[location.pathname] || 'Unknown';
    trackPageView(pageName, location.pathname);
  }, [location.pathname]);
}
