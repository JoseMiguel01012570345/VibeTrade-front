import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import App from "@/App.tsx";
import { BootSplashRouteSync } from "@app/BootSplashRouteSync";
import "@/index.css";
import {
  applyColorSchemeToDocument,
  readStoredColorScheme,
} from "@shared/lib/theme/colorScheme";
import { bootstrapWebApp } from "@app/bootstrap/bootstrapWebApp";
import { restoreAuthSession } from "@features/auth";
import { queryClient } from "@shared/lib/queryClient";
import {
  findStoreByNormalizedName,
  isStoreSurfacePath,
} from "@features/market/logic/store/storePath";
import { normStoreName } from "@features/market/logic/store/marketSliceHelpers";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import {
  applyStoreBootSplashToDom,
  lookupStoreBootSplashByPathname,
  rememberStoreBootSplash,
  storeNameFromPathname,
} from "@shared/lib/storeBootSplash";

applyColorSchemeToDocument(readStoredColorScheme());

async function start() {
  try {
    await restoreAuthSession();
    await bootstrapWebApp();
  } catch {
    /* toast en bootstrapWebApp */
  }

  if (typeof globalThis.window !== "undefined") {
    const path = globalThis.window.location.pathname;
    if (isStoreSurfacePath(path)) {
      const name = storeNameFromPathname(path);
      const store = findStoreByNormalizedName(
        useMarketStore.getState().stores,
        normStoreName(name),
      );
      if (store?.avatarUrl) {
        rememberStoreBootSplash(store.name, store.avatarUrl);
      }
      applyStoreBootSplashToDom(lookupStoreBootSplashByPathname(path));
    }
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BootSplashRouteSync />
          <App />
          <Toaster richColors position="top-center" closeButton />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

void start();
