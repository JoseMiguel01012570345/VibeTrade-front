import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import type { SupplierPortalInventoryRow } from "../Dtos/supplierPortalTypes";

export function proveedorStockDotClass(stock: number) {
  if (stock <= 0) return "bg-red-500";
  if (stock < 5) return "bg-amber-400";
  return "bg-emerald-500";
}

export function isProveedorProductVisibleInStore(row: SupplierPortalInventoryRow) {
  return !row.pendingApproval && row.isAvailable;
}

export function ProveedorProductThumb({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
      {photoUrl ? (
        <ProtectedMediaImg className="size-full object-cover" src={photoUrl} alt={name} />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-[10px] font-medium text-gray-400"
          aria-hidden
        >
          Sin foto
        </div>
      )}
    </div>
  );
}
