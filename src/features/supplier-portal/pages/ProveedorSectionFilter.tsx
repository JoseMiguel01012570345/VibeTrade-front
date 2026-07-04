export function ProveedorSectionFilter({ businessName }: { businessName: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
          Panel de Proveedor
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-600 dark:text-gray-400">
          {businessName
            ? `Monitoriza pedidos e inventario de ${businessName}.`
            : "Monitoriza pedidos e inventario de tu negocio."}
        </p>
      </div>
    </div>
  );
}
