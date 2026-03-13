import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      throwOnError: (_error, query) => query.state.data === undefined,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
