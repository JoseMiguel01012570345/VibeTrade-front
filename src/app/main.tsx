import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "@/App.tsx";
import "@/index.css";
import {
  applyColorSchemeToDocument,
  readStoredColorScheme,
} from "@shared/lib/theme/colorScheme";
import { bootstrapWebApp } from "@app/bootstrap/bootstrapWebApp";
import { restoreAuthSession } from "@features/auth";
import { queryClient } from "@shared/lib/queryClient";

applyColorSchemeToDocument(readStoredColorScheme());

async function start() {
  try {
    await restoreAuthSession();
    await bootstrapWebApp();
  } catch {
    /* toast en bootstrapWebApp */
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void start();
