import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@shared/lib/cn";
import { IconLogout } from "./ProveedorUi";
import type { SupplierPortalMe } from "../Dtos/supplierPortalTypes";
import { clearSupplierId } from "../logic/supplierPortalSession";

const BRAND = "#007A33";

function DashboardIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function ProveedorSidebar({
  me,
  onNavClick,
  onLogout,
  className,
}: {
  me: SupplierPortalMe;
  onNavClick?: () => void;
  onLogout?: () => void;
  className?: string;
}) {
  const nav = useNavigate();

  function logout() {
    clearSupplierId();
    onLogout?.();
    nav("/proveedor", { replace: true });
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-950",
        className,
      )}
    >
      <nav className="flex-1 space-y-1 px-3 py-4">
        <NavLink
          to="/proveedor"
          end
          onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "text-white"
                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
            }`
          }
          style={({ isActive }) =>
            isActive ? { backgroundColor: BRAND } : undefined
          }
        >
          <DashboardIcon />
          <span>Dashboard</span>
        </NavLink>
      </nav>

      <div className="border-t border-gray-100 p-4 dark:border-gray-800">
        <p className="mb-3 truncate px-1 text-xs text-gray-500 dark:text-gray-400">
          {me.businessName}
        </p>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
        >
          <IconLogout className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
