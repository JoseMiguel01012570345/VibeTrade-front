import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Store } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "@features/auth/logic/useAppStore";
import type { User } from "@features/auth/Dtos/userTypes";
import { useStoreAdminExtras } from "../logic/storeAdminStore";

/**
 * Acceso de personal (staff): el personal creado por el dueño de la tienda inicia
 * sesión aquí con `<usuario, contraseña>` y es dirigido directamente al panel de
 * su tienda, sin acceso al resto de la app.
 */
export function StaffLoginPage() {
  const nav = useNavigate();
  const findStaffByCredentials = useStoreAdminExtras(
    (s) => s.findStaffByCredentials,
  );
  const applySessionUser = useAppStore((s) => s.applySessionUser);
  const setSessionActive = useAppStore((s) => s.setSessionActive);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const account = findStaffByCredentials(username.trim(), password);
    if (!account) {
      toast.error("Usuario o contraseña incorrectos.");
      return;
    }
    const staffUser: User = {
      id: account.id,
      name: account.displayName,
      email: "",
      phone: "",
      trustScore: 0,
      staffStoreId: account.storeId,
    };
    applySessionUser(staffUser);
    setSessionActive(true);
    toast.success(`Bienvenido, ${account.displayName}`);
    nav(`/store/${account.storeId}/panel/productos`, { replace: true });
  }

  return (
    <div className="store-admin-surface -mt-4 grid min-h-[calc(100vh-64px)] place-items-center bg-[#eef0f4] px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-700 text-white">
            <Store size={26} aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tight text-gray-900">
            Acceso de personal
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Inicia sesión con las credenciales que te dio la tienda.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-gray-700">Usuario</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoFocus
              className="h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-gray-700">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <LogIn size={16} aria-hidden /> Entrar al panel
        </button>
      </form>
    </div>
  );
}
