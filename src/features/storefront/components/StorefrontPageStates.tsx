import { ArrowLeft } from "lucide-react";
import { StoreEntryLoadingScreen } from "./StoreEntryLoadingScreen";

export function StorefrontLoadingState() {
  return <StoreEntryLoadingScreen label="Cargando tienda" />;
}

export function StorefrontNotFoundState({
  onBack,
}: Readonly<{ onBack: () => void }>) {
  return (
    <div className="store-front-surface min-h-full bg-[var(--bg)]">
      <div className="w-full px-4 py-16 text-center">
        <p className="text-lg font-extrabold text-slate-900">
          Tienda no encontrada
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          onClick={onBack}
        >
          <ArrowLeft size={16} aria-hidden /> Volver al feed
        </button>
      </div>
    </div>
  );
}
