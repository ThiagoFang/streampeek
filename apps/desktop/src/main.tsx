import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import { AppErrorBoundary } from "./components/app-error-boundary";
import { Toaster } from "./components/ui/toaster";
import { createAppQueryClient } from "./lib/query-client";
import { Toast } from "./store/toast";
import "./globals.css";

const queryClient = createAppQueryClient({ showError: Toast.error });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <App />
        <Toaster />
      </AppErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
);
