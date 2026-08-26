import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "./error-message";

interface QueryClientDependencies {
  showError: (message: string) => void;
}

export function createAppQueryClient({ showError }: QueryClientDependencies) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        throwOnError: (_error, query) => query.state.data === undefined,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        const usesToast = query.meta?.errorPresentation === "toast";
        if (query.state.data === undefined && !usesToast) return;
        showError(getErrorMessage(error, "Falha ao carregar dados"));
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return;
        showError(getErrorMessage(error, "Falha ao executar ação"));
      },
    }),
  });
}
