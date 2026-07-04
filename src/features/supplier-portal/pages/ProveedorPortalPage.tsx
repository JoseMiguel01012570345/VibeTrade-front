import { useCallback, useState } from "react";
import { getSupplierId } from "../logic/supplierPortalSession";
import { ProveedorLoginPage } from "./ProveedorLoginPage";
import { ProveedorShell } from "./ProveedorShell";

export function ProveedorPortalPage() {
  const [authenticated, setAuthenticated] = useState(() => !!getSupplierId());

  const handleLoggedIn = useCallback(() => {
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    setAuthenticated(false);
  }, []);

  if (!authenticated || !getSupplierId()) {
    return <ProveedorLoginPage onLoggedIn={handleLoggedIn} />;
  }

  return <ProveedorShell onLogout={handleLogout} />;
}
