import { useEffect, useState } from "react";
import { ProveedorSidebar } from "../components/ProveedorSidebar";
import { PortalShellLayout } from "../components/PortalShellLayout";
import {
  fetchSupplierPortalMe,
  formatSupplierPortalError,
} from "../api/supplierPortalApi";
import type { SupplierPortalMe } from "../Dtos/supplierPortalTypes";
import { ProveedorSection } from "./ProveedorSection";
import "../styles/supplierPortal.css";

export function ProveedorShell({ onLogout }: { onLogout?: () => void }) {
  const [me, setMe] = useState<SupplierPortalMe | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    fetchSupplierPortalMe()
      .then(setMe)
      .catch((e) => setErr(formatSupplierPortalError(e)));
  }, []);

  if (err) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <p className="font-medium text-red-600 dark:text-red-400">{err}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6">
        <p className="text-gray-600 dark:text-gray-400">Cargando…</p>
      </div>
    );
  }

  return (
    <PortalShellLayout
      title="Panel de proveedor"
      mobileSubtitle={me.businessName}
      renderSidebar={(onNavClick) => (
        <ProveedorSidebar me={me} onNavClick={onNavClick} onLogout={onLogout} />
      )}
      footer={
        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">
            Bandera Express
          </p>
          <p>
            © {year} Bandera Express. Todos los derechos reservados para
            Proveedores TCP.
          </p>
        </div>
      }
    >
      <ProveedorSection businessName={me.businessName} />
    </PortalShellLayout>
  );
}
