import { useTrackShipment } from "../logic/useTrackShipment";
import { TrackShipmentCard } from "./TrackShipmentCard";
import { TrackShipmentError } from "./TrackShipmentError";
import { TrackShipmentFeatures } from "./TrackShipmentFeatures";
import { TrackShipmentSuccessCard } from "./TrackShipmentSuccessCard";

/**
 * Contenido del buscador de rastreo (título + tarjeta con el número de pedido). Sin superficie
 * propia: lo envuelve la página global (`TrackShipmentPage`) o la variante con cintillo de
 * tienda (`StorefrontTrackingPage`). Al consultar, si el pedido existe se muestra el resultado
 * en la misma pantalla (tarjeta con estado/hilo/comprobante); si no, el estado de error. La
 * fila de features sólo se ve mientras no hay resultado ni error.
 */
export function TrackShipmentContent() {
  const {
    inputRef,
    orderQuery,
    changeQuery,
    submitting,
    lookupFailed,
    canSubmit,
    onSubmit,
    onRetry,
    trackingSuccess,
    trackedOrder,
    pdfLoading,
    downloadReceipt,
  } = useTrackShipment();

  const showFeatures = !lookupFailed && !trackingSuccess;

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-10 px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="text-[2rem] font-extrabold tracking-tight text-slate-900 sm:text-[2.25rem]">
          Rastrea tu Envío
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Actualizaciones sobre tus pedidos. Introduce el número público (BX-…)
          o el identificador que recibiste al confirmar la compra.
        </p>
      </header>

      <TrackShipmentCard
        inputRef={inputRef}
        value={orderQuery}
        onChange={changeQuery}
        onSubmit={onSubmit}
        submitting={submitting}
        canSubmit={canSubmit}
      />

      {trackingSuccess && trackedOrder ? (
        <TrackShipmentSuccessCard
          model={trackingSuccess}
          deliveryMode={trackedOrder.deliveryMode}
          pdfLoading={pdfLoading}
          onDownloadReceipt={downloadReceipt}
        />
      ) : null}

      {lookupFailed ? <TrackShipmentError onRetry={onRetry} /> : null}

      {showFeatures ? <TrackShipmentFeatures /> : null}
    </div>
  );
}
