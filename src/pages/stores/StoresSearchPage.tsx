import { Navigate } from "react-router-dom";

/** @deprecated Usar la ruta `/search`. */
export function StoresSearchPage() {
  return <Navigate to="/search" replace />;
}
