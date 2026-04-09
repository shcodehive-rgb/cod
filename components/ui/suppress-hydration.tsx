'use client';

import { useEffect, useState } from 'react';

interface SuppressHydrationProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to suppress hydration warnings caused by browser extensions
 * that add attributes like fdprocessedid to DOM elements
 */
export function SuppressHydration({ children, fallback = null }: SuppressHydrationProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render fallback on server, children on client
  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
