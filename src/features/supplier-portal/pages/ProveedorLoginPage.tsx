import { useState, type FormEvent } from "react";
import { Lock, User } from "lucide-react";
import {
  formatSupplierPortalError,
  supplierPortalLogin,
} from "../api/supplierPortalApi";
import { setSupplierId } from "../logic/supplierPortalSession";

const inputWrap =
  "w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#007A33] focus:ring-1 focus:ring-[#007A33] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

export function ProveedorLoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const year = new Date().getFullYear();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const result = await supplierPortalLogin(username.trim(), password);
      setSupplierId(result.supplierId);
      onLoggedIn();
    } catch (e) {
      setErr(formatSupplierPortalError(e) || "Credenciales inválidas");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F9F9F9] text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#007A33] shadow-sm text-white"
            aria-hidden
          >
            <User className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#007A33]">
            Portal de proveedor
          </h1>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-900 dark:shadow-none">
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div>
              <label
                htmlFor="proveedor-login-user"
                className="text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Usuario
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="proveedor-login-user"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="usuario del portal"
                  value={username}
                  aria-invalid={err ? true : undefined}
                  className={`${inputWrap} pl-10 pr-3`}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErr(null);
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="proveedor-login-password"
                className="text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="proveedor-login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={err ? true : undefined}
                  className={`${inputWrap} pl-10 pr-11`}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErr(null);
                  }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            {err ? (
              <p
                role="alert"
                className="text-sm font-medium text-red-600 dark:text-red-400"
              >
                {err}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#007A33] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00662b] focus:outline-none focus:ring-2 focus:ring-[#007A33] focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-900"
            >
              {busy ? "Entrando…" : "Iniciar Sesión"}
            </button>
          </form>
        </div>

        <p className="mt-10 max-w-md text-center text-[11px] text-gray-400 dark:text-gray-500">
          © {year} Bandera Express. Acceso exclusivo para proveedores.
        </p>
      </main>
    </div>
  );
}
