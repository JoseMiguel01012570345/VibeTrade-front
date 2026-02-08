import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Plus, Package, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: Home, label: "Browse", page: "Home" },
  { icon: Plus, label: "Sell", page: "NewListing" },
  { icon: Package, label: "My Items", page: "MyListings" },
  { icon: Store, label: "Business", page: "BusinessSetup" },
];

const HIDE_NAV_PAGES = ["ItemDetail", "Checkout"];

export default function Layout({ children, currentPageName }) {
  const showNav = !HIDE_NAV_PAGES.includes(currentPageName);

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        :root {
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        body {
          font-family: var(--font-sans);
          -webkit-font-smoothing: antialiased;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <main className={showNav ? "pb-20" : ""}>
        {children}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-2">
            {NAV_ITEMS.map(({ icon: Icon, label, page }) => {
              const active = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200",
                    active
                      ? "text-emerald-600"
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}