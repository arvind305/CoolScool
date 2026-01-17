'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/queries/query-client';
import { APIClientInitializer } from '@/hooks/use-auth-token';

interface Props {
  children: React.ReactNode;
}

export function QueryProvider({ children }: Props) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <APIClientInitializer>
        {children}
      </APIClientInitializer>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
