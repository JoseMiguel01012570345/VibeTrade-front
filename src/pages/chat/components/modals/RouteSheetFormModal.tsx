import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import toast from "react-hot-toast";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { cn } from "../../../../lib/cn";
import {
  nominatimReverse,
  nominatimSearch,
} from "../../../../utils/map/nominatimGeocode";
import {
  routeMapNumberedWaypointIcon,
  storeMapPinIcon,
} from "../../../../utils/map/storeMapPinIcon";
import "leaflet/dist/leaflet.css";
import "../../../home/emergentRouteMapMarkers.css";
import { ModalFormField as Field } from "./ModalFormField";
import {
  buildDestinoMapPriorContext,
  emptyTramo,
  expandChainedTramoOrigins,
  parseRouteLatLngInputPair,
  tramosToLimpios,
} from "../../lib/routeSheetTramoFormUtils";
import {
  agrDetailSub,
  detailsBlock,
  fieldError,
  fieldLabel,
  fieldRootWithInvalid,
  mapBackdropLayerAboveChatRail,
  modalFormBody,
  modalShellWide,
  modalSub,
  rutaCoordsHint,
  rutaCoordsRow,
  rutaMapBtn,
  rutaTramoCard,
  rutaTramoGrid,
  rutaTramoHead,
  rutaTramoRemoveBtn,
  rutaTramosBlock,
} from "../../styles/formModalStyles";
import { MapPin, Trash2 } from "lucide-react";
import {
  routeSheetLegacyHead,
  routeStopsToFormInputs,
  type RouteSheet,
  type RouteSheetCreatePayload,
  type RouteTramoFormInput,
} from "../../domain/routeSheetTypes";
import type { RouteSheetFormErrors } from "../../domain/routeSheetValidation";
import {
  getRouteSheetFormErrors,
  hasRouteSheetFormErrors,
  normalizeRouteSheetParadas,
  routeSheetFormErrorCount,
  validateRouteCoordPair,
} from "../../domain/routeSheetValidation";
import type { RouteOfferPublicState } from "../../../../app/store/marketStoreTypes";
import { paymentCurrencyVtOptions } from "../../domain/routeSheetMonedaOptions";
import { fetchCurrencies } from "../../../../utils/market/fetchCurrencies";
import { VibeMapTileLayer } from "../../../home/EmergentRouteFeedMap";
import { LeafletRoadSnappedRoute } from "../../../home/LeafletRoadSnappedRoute";
import { VtSelect } from "../../../../components/VtSelect";
import { postRouteSheetNotifyPreselected } from "../../../../utils/chat/chatApi";
import { getSessionToken } from "../../../../utils/http/sessionToken";
import { RouteSheetTransportistaPhoneField } from "./RouteSheetTransportistaPhoneField";
import {
  confirmedAssignmentOnFormTramo,
  effectiveRouteOfferForSheetForm,
  normRoutePhoneKey,
} from "../../domain/routeSheetOfferGuards";

export type RouteSheetFormPayload = RouteSheetCreatePayload;

export type RouteSheetSubmitResult =
  | { ok: false }
  | { ok: true; routeSheetId: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Hilo del chat (p. ej. <code>cth_…</code>); hace falta para avisar a transportistas tras guardar. */
  threadId: string;
  initialRouteSheet?: RouteSheet | null;
  /** Oferta pública resuelta por hoja (preferida para bloqueo / teléfono). */
  routeOfferForSheet?: RouteOfferPublicState | undefined;
  /** Oferta pública del hilo (`resolveRouteOfferPublicForThread`); usada como respaldo si la de arriba es undefined. */
  routeOfferForThread?: RouteOfferPublicState | undefined;
  onSubmit: (p: RouteSheetFormPayload) => RouteSheetSubmitResult;
};

type MapPick = { tramoIndex: number; punto: "origen" | "destino" };

const ROUTE_MAP_DEFAULT_CENTER: [number, number] = [22.526838, -81.128701];
const ROUTE_MAP_ZOOM = 9;
const ROUTE_MAP_ZOOM_POINT = 13;

function formatPickedCoord(n: number): string {
  return n.toFixed(6);
}

function RouteMapClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Cámara: con destino y trazado previo hace encuadre; con pin actual prioriza el pin; si no, centro/zoom del formulario.
 */
function RouteMapCameraSync({
  defaultCenter,
  defaultZoom,
  pickPos,
  destinoPriorLine,
}: {
  defaultCenter: [number, number];
  defaultZoom: number;
  pickPos: { lat: number; lng: number } | null;
  destinoPriorLine: [number, number][];
}) {
  const map = useMap();
  const priorKey = destinoPriorLine.map((p) => `${p[0]},${p[1]}`).join("|");
  useEffect(() => {
    if (pickPos) {
      map.setView(
        [pickPos.lat, pickPos.lng],
        Math.max(ROUTE_MAP_ZOOM_POINT, 13),
        { animate: false },
      );
      return;
    }
    if (destinoPriorLine.length >= 2) {
      const b = L.latLngBounds(destinoPriorLine);
      map.fitBounds(b, { padding: [24, 24], maxZoom: 15, animate: false });
      return;
    }
    if (destinoPriorLine.length === 1) {
      const p0 = destinoPriorLine[0];
      if (p0) map.setView(p0, 13, { animate: false });
      return;
    }
    map.setView(defaultCenter, defaultZoom, { animate: false });
  }, [
    map,
    defaultCenter[0],
    defaultCenter[1],
    defaultZoom,
    pickPos?.lat,
    pickPos?.lng,
    priorKey,
  ]);
  return null;
}

/** En el formulario, el origen del tramo i&gt;0 no se guarda en el estado: se deriva del destino del tramo i−1. */
function clearDerivedOriginsInForm(
  tramos: RouteTramoFormInput[],
): RouteTramoFormInput[] {
  return tramos.map((t, i) =>
    i === 0 ? t : { ...t, origen: "", origenLat: "", origenLng: "" },
  );
}

export function RouteSheetFormModal({
  open,
  onClose,
  threadId,
  initialRouteSheet,
  routeOfferForSheet,
  routeOfferForThread,
  onSubmit,
}: Props) {
  const [titulo, setTitulo] = useState("");
  const [merc, setMerc] = useState("");
  const [notasG, setNotasG] = useState("");
  const [tramos, setTramos] = useState<RouteTramoFormInput[]>([
    emptyTramo(),
    emptyTramo(),
  ]);
  const [mapPick, setMapPick] = useState<MapPick | null>(null);
  const [mapLat, setMapLat] = useState("");
  const [mapLng, setMapLng] = useState("");
  const [mapPlaceLabel, setMapPlaceLabel] = useState("");
  const [mapCoordError, setMapCoordError] = useState<string | undefined>(
    undefined,
  );
  const [formErrors, setFormErrors] = useState<RouteSheetFormErrors>({});
  /** Tras un guardado exitoso, si hay teléfonos en tramos, preguntamos si notificar. */
  const [notifyAfterSave, setNotifyAfterSave] = useState<{
    routeSheetId: string;
    phones: string[];
  } | null>(null);
  const [notifyBusy, setNotifyBusy] = useState(false);
  /** Códigos de moneda permitidos (GET /api/v1/market/currencies), mismo origen que el catálogo. */
  const [currencyCodes, setCurrencyCodes] = useState<string[]>([]);
  const offerForTramo = useMemo(
    () =>
      effectiveRouteOfferForSheetForm(
        routeOfferForSheet,
        routeOfferForThread,
        initialRouteSheet?.id,
      ),
    [routeOfferForSheet, routeOfferForThread, initialRouteSheet?.id],
  );
  const offerTramoRef = useRef(offerForTramo);
  offerTramoRef.current = offerForTramo;
  const editBaselineJsonRef = useRef<string | null>(null);
  /** Invalida búsquedas Nominatim al cerrar el mapa o abrir otro punto. */
  const mapForwardTokenRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    void (async () => {
      try {
        const list = await fetchCurrencies();
        if (!cancel) setCurrencyCodes(list);
      } catch {
        if (!cancel) setCurrencyCodes([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setNotifyAfterSave(null);
    setNotifyBusy(false);
    setFormErrors({});
    setMapPick(null);
    setMapPlaceLabel("");
    setMapCoordError(undefined);
    mapForwardTokenRef.current += 1;
    if (initialRouteSheet) {
      const rs = initialRouteSheet;
      const ro = offerTramoRef.current;
      const offerMap =
        ro?.routeSheetId === rs.id
          ? new Map(ro.tramos.map((t) => [t.stopId, t]))
          : undefined;
      const tramosInitRaw =
        rs.paradas.length > 0
          ? routeStopsToFormInputs(
              rs.paradas,
              routeSheetLegacyHead(rs),
              offerMap,
              rs.monedaPago ?? "",
            )
          : [emptyTramo(), emptyTramo()];
      const tramosInit = clearDerivedOriginsInForm(tramosInitRaw);
      setTitulo(rs.titulo);
      setMerc(rs.mercanciasResumen);
      setNotasG(rs.notasGenerales ?? "");
      setTramos(tramosInit);
      const limpios0 = expandChainedTramoOrigins(tramosToLimpios(tramosInit));
      const draft0: RouteSheetCreatePayload = {
        titulo: rs.titulo.trim(),
        mercanciasResumen: rs.mercanciasResumen.trim(),
        paradas: limpios0,
        notasGenerales: (rs.notasGenerales ?? "").trim(),
      };
      const err0 = getRouteSheetFormErrors(draft0);
      if (hasRouteSheetFormErrors(err0)) {
        editBaselineJsonRef.current = null;
      } else {
        const persisted0: RouteSheetCreatePayload = {
          ...draft0,
          paradas: normalizeRouteSheetParadas(limpios0),
        };
        editBaselineJsonRef.current = JSON.stringify(persisted0);
      }
    } else {
      editBaselineJsonRef.current = null;
      setTitulo("");
      setMerc("");
      setNotasG("");
      setTramos([emptyTramo(), emptyTramo()]);
    }
  }, [open, initialRouteSheet?.id]);

  const routeMapCenter = useMemo((): [number, number] => {
    if (!mapPick) return ROUTE_MAP_DEFAULT_CENTER;
    const p = parseRouteLatLngInputPair(mapLat, mapLng);
    if (p) return [p.lat, p.lng];
    return ROUTE_MAP_DEFAULT_CENTER;
  }, [mapPick, mapLat, mapLng]);

  const routeMapZoom = useMemo(() => {
    const p = parseRouteLatLngInputPair(mapLat, mapLng);
    return p ? ROUTE_MAP_ZOOM_POINT : ROUTE_MAP_ZOOM;
  }, [mapLat, mapLng]);

  const destinoMapPrior = useMemo(() => {
    if (mapPick?.punto !== "destino") return null;
    return buildDestinoMapPriorContext(tramos, mapPick.tramoIndex);
  }, [mapPick, tramos]);

  const monedaOptionsFor = useCallback(
    (cur: string) => paymentCurrencyVtOptions(cur, currencyCodes),
    [currencyCodes],
  );

  useEffect(() => {
    if (!mapPick || !open) return;
    const parsed = parseRouteLatLngInputPair(mapLat, mapLng);
    if (!parsed) return;
    const ac = new AbortController();
    const tid = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const label = await nominatimReverse(
            parsed.lat,
            parsed.lng,
            ac.signal,
          );
          if (!ac.signal.aborted && label) setMapPlaceLabel(label);
        } catch {
          /* cancelado o red */
        }
      })();
    }, 450);
    return () => {
      globalThis.clearTimeout(tid);
      ac.abort();
    };
  }, [mapPick, mapLat, mapLng, open]);

  if (!open) return null;

  function openMapPicker(tramoIndex: number, punto: "origen" | "destino") {
    if (punto === "origen" && tramoIndex > 0) return;
    const t = tramos[tramoIndex];
    if (!t) return;
    setMapCoordError(undefined);
    const token = ++mapForwardTokenRef.current;

    let latStr = "";
    let lngStr = "";
    let labelStr = "";
    if (punto === "origen") {
      latStr = t.origenLat ?? "";
      lngStr = t.origenLng ?? "";
      labelStr = t.origen ?? "";
    } else {
      latStr = t.destinoLat ?? "";
      lngStr = t.destinoLng ?? "";
      labelStr = t.destino ?? "";
    }
    setMapLat(latStr);
    setMapLng(lngStr);
    setMapPlaceLabel(labelStr.trim());
    setMapPick({ tramoIndex, punto });

    if (parseRouteLatLngInputPair(latStr, lngStr)) return;
    const q = labelStr.trim();
    if (q.length < 3) return;

    void (async () => {
      try {
        const r = await nominatimSearch(q);
        if (mapForwardTokenRef.current !== token || !r) return;
        setMapLat(formatPickedCoord(r.lat));
        setMapLng(formatPickedCoord(r.lng));
        setMapPlaceLabel(r.label);
        setMapCoordError(undefined);
      } catch {
        /* ignore */
      }
    })();
  }

  async function geocodePlaceToMap() {
    const q = mapPlaceLabel.trim();
    if (q.length < 3) {
      toast.error("Escribí al menos 3 caracteres de dirección");
      return;
    }
    const token = ++mapForwardTokenRef.current;
    try {
      const r = await nominatimSearch(q);
      if (mapForwardTokenRef.current !== token) return;
      if (!r) {
        toast.error("No se encontró esa dirección");
        return;
      }
      setMapLat(formatPickedCoord(r.lat));
      setMapLng(formatPickedCoord(r.lng));
      setMapPlaceLabel(r.label);
      setMapCoordError(undefined);
    } catch {
      if (mapForwardTokenRef.current === token)
        toast.error("No se pudo buscar la dirección. Probá de nuevo.");
    }
  }

  function applyMapCoords() {
    if (!mapPick) return;
    const coordErr = validateRouteCoordPair(mapLat, mapLng);
    if (coordErr) {
      setMapCoordError(coordErr);
      return;
    }
    setMapCoordError(undefined);
    mapForwardTokenRef.current += 1;
    const lat = mapLat.trim();
    const lng = mapLng.trim();
    const place = mapPlaceLabel.trim();
    setTramos((prev) => {
      const next = [...prev];
      const row = { ...next[mapPick.tramoIndex] };
      if (mapPick.punto === "origen") {
        row.origenLat = lat || undefined;
        row.origenLng = lng || undefined;
        if (place) row.origen = place;
      } else {
        row.destinoLat = lat || undefined;
        row.destinoLng = lng || undefined;
        if (place) row.destino = place;
      }
      next[mapPick.tramoIndex] = row;
      return next;
    });
    toast.success("Ubicación guardada");
    setMapPick(null);
  }

  function trySubmit() {
    const t = titulo.trim();
    const m = merc.trim();
    const limpios = expandChainedTramoOrigins(tramosToLimpios(tramos));
    const draft: RouteSheetCreatePayload = {
      titulo: t,
      mercanciasResumen: m,
      paradas: limpios,
      notasGenerales: notasG.trim(),
    };
    const e = getRouteSheetFormErrors(draft);
    setFormErrors(e);
    if (hasRouteSheetFormErrors(e)) {
      const n = routeSheetFormErrorCount(e);
      toast.error(`Revisá el formulario (${n} error${n === 1 ? "" : "es"})`);
      return;
    }
    const limpForLock = expandChainedTramoOrigins(tramosToLimpios(tramos));
    const sheetIdLock = initialRouteSheet?.id?.trim();
    if (sheetIdLock && offerForTramo) {
      for (let i = 0; i < limpForLock.length; i++) {
        const asg = confirmedAssignmentOnFormTramo(
          offerForTramo,
          sheetIdLock,
          tramos[i]?.paradaId,
          initialRouteSheet?.paradas[i],
        );
        if (!asg) continue;
        const expected = asg.phone?.trim() ?? "";
        const actual = limpForLock[i]?.telefonoTransportista?.trim() ?? "";
        if (normRoutePhoneKey(expected) !== normRoutePhoneKey(actual)) {
          toast.error(
            `No podés quitar ni cambiar el contacto del transportista ya confirmado en el tramo ${i + 1} (${asg.displayName?.trim() || "asignado"}).`,
          );
          return;
        }
      }
    }
    const paradasFinal = normalizeRouteSheetParadas(limpios);
    const payload: RouteSheetCreatePayload = {
      ...draft,
      paradas: paradasFinal,
    };
    if (initialRouteSheet && editBaselineJsonRef.current !== null) {
      if (JSON.stringify(payload) === editBaselineJsonRef.current) {
        toast.error("No hay cambios para guardar.");
        return;
      }
    }
    const persisted = onSubmit(payload);
    if (!persisted.ok) return;
    const phoneList = paradasFinal
      .map((p) => p.telefonoTransportista?.trim())
      .filter((x): x is string => !!x && x.length > 0);
    const uniquePhones = [...new Set(phoneList)];
    if (
      uniquePhones.length > 0 &&
      threadId.startsWith("cth_") &&
      getSessionToken()
    ) {
      setNotifyAfterSave({
        routeSheetId: persisted.routeSheetId,
        phones: uniquePhones,
      });
      return;
    }
    setFormErrors({});
    onClose();
    toast.success(
      initialRouteSheet ? "Hoja de ruta actualizada" : "Hoja de ruta creada",
    );
  }

  async function completeSaveAfterNotifyChoice(shouldNotify: boolean) {
    if (!notifyAfterSave) return;
    const saved = { ...notifyAfterSave };
    setNotifyAfterSave(null);
    if (shouldNotify && threadId.startsWith("cth_")) {
      setNotifyBusy(true);
      try {
        const { notifiedCount } = await postRouteSheetNotifyPreselected(
          threadId,
          saved.routeSheetId,
          saved.phones,
        );
        if (notifiedCount > 0) {
          toast.success(
            `Hoja guardada. Se notificó a ${notifiedCount} usuario${
              notifiedCount === 1 ? "" : "s"
            }.`,
          );
        } else {
          toast.success(
            "Hoja guardada. Ningún número coincidió con un usuario al que avisar.",
          );
        }
      } catch {
        toast.error("La hoja se guardó, pero no se pudo enviar el aviso.");
      } finally {
        setNotifyBusy(false);
      }
    } else {
      toast.success(
        initialRouteSheet ? "Hoja de ruta actualizada" : "Hoja de ruta creada",
      );
    }
    setFormErrors({});
    onClose();
  }

  function updateTramo(i: number, patch: Partial<RouteTramoFormInput>) {
    if (patch.telefonoTransportista !== undefined) {
      const row = tramos[i];
      const asg = confirmedAssignmentOnFormTramo(
        offerForTramo,
        initialRouteSheet?.id,
        row?.paradaId,
        initialRouteSheet?.paradas[i],
      );
      if (asg) {
        const nxt = patch.telefonoTransportista?.trim() ?? "";
        const exp = asg.phone?.trim() ?? "";
        if (normRoutePhoneKey(nxt) !== normRoutePhoneKey(exp)) {
          toast.error(
            "No podés quitar ni cambiar el contacto de un transportista confirmado en este tramo.",
          );
          return;
        }
      }
    }
    setTramos((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function addTramoAfterLast() {
    setTramos((prev) => [...prev, emptyTramo()]);
    setFormErrors({});
  }

  function removeTramoAt(index: number) {
    const row = tramos[index];
    if (
      initialRouteSheet?.id &&
      offerForTramo &&
      confirmedAssignmentOnFormTramo(
        offerForTramo,
        initialRouteSheet.id,
        row?.paradaId,
        initialRouteSheet?.paradas[index],
      )
    ) {
      toast.error(
        "No podés eliminar un tramo que ya tiene un transportista confirmado.",
      );
      return;
    }
    setTramos((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, j) => j !== index);
    });
    setMapPick((mp) => {
      if (!mp) return null;
      if (mp.tramoIndex === index) return null;
      if (mp.tramoIndex > index)
        return { ...mp, tramoIndex: mp.tramoIndex - 1 };
      return mp;
    });
    setFormErrors({});
  }

  const err = formErrors;
  const routeMapMarkerPos = mapPick
    ? parseRouteLatLngInputPair(mapLat, mapLng)
    : null;
  const destinoPriorLineForCamera =
    mapPick?.punto === "destino" ? (destinoMapPrior?.linePositions ?? []) : [];

  return (
    <>
      <div
        className={mapBackdropLayerAboveChatRail}
        role="dialog"
        aria-modal="true"
      >
        <div className={modalShellWide}>
          <div className="vt-modal-title">
            {initialRouteSheet ? "Editar hoja de rutas" : "Nueva hoja de rutas"}
          </div>
          <div className={modalSub}>
            Todos los campos son obligatorios. Tiempos estimados y precio del
            tramo deben ser números (ej. horas o monto). La moneda de pago se
            elige en cada tramo. Origen, destino y el mapa se sincronizan
            (dirección ↔ pin). A partir del segundo tramo, el origen coincide
            con el destino del tramo anterior (solo editable ahí).
          </div>
          <div className={modalFormBody}>
            <Field
              label="Título"
              value={titulo}
              onChange={setTitulo}
              error={err.titulo}
              inputId="ruta-titulo"
            />
            <Field
              label="Mercancías / bultos (resumen general)"
              value={merc}
              onChange={setMerc}
              multiline
              rows={3}
              error={err.mercanciasResumen}
              inputId="ruta-merc"
            />
            <div className={cn(detailsBlock, rutaTramosBlock)}>
              <strong>Tramos del recorrido</strong>
              {err.paradasGlobal ? (
                <div className={cn(fieldError, "mt-2")} role="alert">
                  {err.paradasGlobal}
                </div>
              ) : null}
              {tramos.map((p, i) => {
                const te = err.tramos?.[i];
                const confAsg = confirmedAssignmentOnFormTramo(
                  offerForTramo,
                  initialRouteSheet?.id,
                  p.paradaId,
                  initialRouteSheet?.paradas[i],
                );
                console.log({
                  offerForTramo,
                  initialRouteSheet: initialRouteSheet?.id,
                  paradaId: p.paradaId,
                  parada: initialRouteSheet?.paradas[i],
                });
                const phoneLocked = confAsg != null;
                const displayTel =
                  p.telefonoTransportista?.trim() ||
                  confAsg?.phone?.trim() ||
                  undefined;
                const prevStop = i > 0 ? tramos[i - 1] : null;
                const origenLocked = i > 0;
                const origenNombre = origenLocked
                  ? (prevStop?.destino ?? "")
                  : p.origen;
                const origenLatShown = origenLocked
                  ? (prevStop?.destinoLat ?? "")
                  : (p.origenLat ?? "");
                const origenLngShown = origenLocked
                  ? (prevStop?.destinoLng ?? "")
                  : (p.origenLng ?? "");
                return (
                  <div
                    key={p.paradaId ?? `tramo-${i}`}
                    className={rutaTramoCard}
                  >
                    <div className={rutaTramoHead}>
                      <span className={agrDetailSub}>Tramo {i + 1}</span>
                      <button
                        type="button"
                        className={rutaTramoRemoveBtn}
                        disabled={tramos.length <= 1 || phoneLocked}
                        title={
                          tramos.length <= 1
                            ? "Debe quedar al menos un tramo"
                            : phoneLocked
                              ? "No podés eliminar un tramo con transportista confirmado"
                              : "Eliminar este tramo"
                        }
                        onClick={() => removeTramoAt(i)}
                      >
                        <Trash2 size={14} aria-hidden />
                        <span>Eliminar tramo</span>
                      </button>
                    </div>
                    <div className={rutaTramoGrid}>
                      <Field
                        label="Origen"
                        value={origenNombre}
                        onChange={(v) => {
                          if (origenLocked) return;
                          updateTramo(i, { origen: v });
                        }}
                        readOnly={origenLocked}
                        error={te?.origen}
                        placeholder="Ubicación de origen"
                        inputId={`ruta-tramo-${i}-origen`}
                      />
                      <Field
                        label="Destino"
                        value={p.destino}
                        onChange={(v) => updateTramo(i, { destino: v })}
                        error={te?.destino}
                        placeholder="Ubicación de destino"
                        inputId={`ruta-tramo-${i}-destino`}
                      />
                    </div>
                    {origenLocked ? (
                      <p className="vt-muted mb-2 text-[11px] leading-snug">
                        Mismo lugar y coordenadas que el{" "}
                        <b>destino del tramo {i}</b>. Para cambiarlos, editá ese
                        destino o sus coordenadas en el mapa.
                      </p>
                    ) : null}
                    <div className={rutaCoordsRow}>
                      <button
                        type="button"
                        className={rutaMapBtn}
                        disabled={origenLocked}
                        title={
                          origenLocked
                            ? "El origen toma las coordenadas del destino del tramo anterior"
                            : undefined
                        }
                        onClick={() => openMapPicker(i, "origen")}
                      >
                        <MapPin size={14} /> Coordenadas origen (mapa)
                      </button>
                      <button
                        type="button"
                        className={rutaMapBtn}
                        onClick={() => openMapPicker(i, "destino")}
                      >
                        <MapPin size={14} /> Coordenadas destino (mapa)
                      </button>
                    </div>
                    {te?.coordOrigen ? (
                      <div className={fieldError} role="alert">
                        {te.coordOrigen}
                        {origenLocked ? (
                          <span className="block pt-1 text-[11px] font-normal opacity-90">
                            Si falta el mapa del origen, cargá las coordenadas
                            de <b>destino</b> del tramo {i}.
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {origenLatShown || origenLngShown ? (
                      <div className={rutaCoordsHint}>
                        Origen: {origenLatShown || "—"}, {origenLngShown || "—"}
                      </div>
                    ) : null}
                    {te?.coordDestino ? (
                      <div className={fieldError} role="alert">
                        {te.coordDestino}
                      </div>
                    ) : null}
                    {p.destinoLat || p.destinoLng ? (
                      <div className={rutaCoordsHint}>
                        Destino: {p.destinoLat ?? "—"}, {p.destinoLng ?? "—"}
                      </div>
                    ) : null}
                    <Field
                      label="Responsabilidad por daños por embalaje (este tramo)"
                      value={p.responsabilidadEmbalaje ?? ""}
                      onChange={(v) =>
                        updateTramo(i, { responsabilidadEmbalaje: v })
                      }
                      multiline
                      placeholder="Quién responde y en qué casos"
                      error={te?.responsabilidadEmbalaje}
                      inputId={`ruta-tramo-${i}-resp-emb`}
                    />
                    <Field
                      label="Requisitos especiales (este tramo)"
                      value={p.requisitosEspeciales ?? ""}
                      onChange={(v) =>
                        updateTramo(i, { requisitosEspeciales: v })
                      }
                      multiline
                      placeholder="Frágil, refrigerado, ADR, etc."
                      error={te?.requisitosEspeciales}
                      inputId={`ruta-tramo-${i}-req`}
                    />
                    <Field
                      label="Tipo de vehículo requerido (este tramo)"
                      value={p.tipoVehiculoRequerido ?? ""}
                      onChange={(v) =>
                        updateTramo(i, { tipoVehiculoRequerido: v })
                      }
                      placeholder="Ej. camión baranda, refrigerado, sider"
                      error={te?.tipoVehiculoRequerido}
                      inputId={`ruta-tramo-${i}-veh`}
                    />
                    <RouteSheetTransportistaPhoneField
                      tramoIndex={i}
                      value={displayTel}
                      onChange={(tel) =>
                        updateTramo(i, {
                          telefonoTransportista: tel,
                        })
                      }
                      error={te?.telefonoTransportista}
                      phoneLocked={phoneLocked}
                      lockedDisplayName={confAsg?.displayName}
                    />
                    <div className={rutaTramoGrid}>
                      <Field
                        label="Tiempo estimado recogida (horas, número)"
                        value={p.tiempoRecogidaEstimado ?? ""}
                        onChange={(v) =>
                          updateTramo(i, { tiempoRecogidaEstimado: v })
                        }
                        error={te?.tiempoRecogidaEstimado}
                        inputId={`ruta-tramo-${i}-trec`}
                        inputMode="decimal"
                        placeholder="Ej. 2 o 3.5"
                      />
                      <Field
                        label="Tiempo estimado entrega (horas, número)"
                        value={p.tiempoEntregaEstimado ?? ""}
                        onChange={(v) =>
                          updateTramo(i, { tiempoEntregaEstimado: v })
                        }
                        error={te?.tiempoEntregaEstimado}
                        inputId={`ruta-tramo-${i}-tent`}
                        inputMode="decimal"
                        placeholder="Ej. 4"
                      />
                    </div>
                    <Field
                      label="Precio desglosado (transportista, este tramo)"
                      value={p.precioTransportista ?? ""}
                      onChange={(v) =>
                        updateTramo(i, { precioTransportista: v })
                      }
                      placeholder="Monto numérico (ej. 150000 o 1500.50)"
                      error={te?.precioTransportista}
                      inputId={`ruta-tramo-${i}-precio`}
                      inputMode="decimal"
                    />
                    <div
                      className={cn(
                        fieldRootWithInvalid(!!te?.monedaPago),
                        "w-full",
                      )}
                    >
                      <span
                        className={fieldLabel}
                        id={`ruta-tramo-${i}-moneda-lbl`}
                      >
                        Moneda de pago (este tramo)
                      </span>
                      <VtSelect
                        value={p.monedaPago ?? ""}
                        onChange={(v) => updateTramo(i, { monedaPago: v })}
                        options={monedaOptionsFor(p.monedaPago ?? "")}
                        placeholder="Elegir moneda…"
                        listPortal
                        listPortalZIndexClass="z-[400]"
                        ariaLabel={`Moneda de pago del tramo ${i + 1}`}
                        buttonClassName="vt-input w-full min-h-[2.5rem] justify-between"
                      />
                      {te?.monedaPago ? (
                        <span className={fieldError} role="alert">
                          {te.monedaPago}
                        </span>
                      ) : null}
                    </div>
                    <Field
                      label="Carga en este tramo"
                      value={p.cargaEnTramo ?? ""}
                      onChange={(v) => updateTramo(i, { cargaEnTramo: v })}
                      multiline
                      placeholder="Qué lleva el transportista en el tramo"
                      error={te?.cargaEnTramo}
                      inputId={`ruta-tramo-${i}-carga`}
                    />
                    <div className={rutaTramoGrid}>
                      <Field
                        label="Tipo de mercancía (carga)"
                        value={p.tipoMercanciaCarga ?? ""}
                        onChange={(v) =>
                          updateTramo(i, { tipoMercanciaCarga: v })
                        }
                        error={te?.tipoMercanciaCarga}
                        inputId={`ruta-tramo-${i}-tmc`}
                      />
                      <Field
                        label="Tipo de mercancía (descarga)"
                        value={p.tipoMercanciaDescarga ?? ""}
                        onChange={(v) =>
                          updateTramo(i, { tipoMercanciaDescarga: v })
                        }
                        error={te?.tipoMercanciaDescarga}
                        inputId={`ruta-tramo-${i}-tmd`}
                      />
                    </div>
                    <Field
                      label="Notas del tramo"
                      value={p.notas ?? ""}
                      onChange={(v) => updateTramo(i, { notas: v })}
                      multiline
                      error={te?.notas}
                      inputId={`ruta-tramo-${i}-notas`}
                    />
                  </div>
                );
              })}
              <button
                type="button"
                className="vt-btn"
                onClick={addTramoAfterLast}
              >
                + Agregar tramo
              </button>
            </div>

            <Field
              label="Notas generales"
              value={notasG}
              onChange={setNotasG}
              multiline
              error={err.notasGenerales}
              inputId="ruta-notas-g"
            />
          </div>
          <div className="vt-modal-actions">
            <button type="button" className="vt-btn" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="vt-btn vt-btn-primary"
              onClick={trySubmit}
            >
              {initialRouteSheet ? "Guardar cambios" : "Guardar hoja de ruta"}
            </button>
          </div>
        </div>
      </div>

      {notifyAfterSave ? (
        <div
          className={mapBackdropLayerAboveChatRail}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ruta-notify-transportista-title"
        >
          <div className={modalShellWide} onClick={(e) => e.stopPropagation()}>
            <div
              className="vt-modal-title"
              id="ruta-notify-transportista-title"
            >
              ¿Notificar al transportista?
            </div>
            <div className={modalSub}>
              La hoja ya se guardó. ¿Querés avisar por la app a quien tenga
              cuenta con el número que indicaste
              {notifyAfterSave.phones.length > 1
                ? " en los tramos"
                : " en el tramo"}{" "}
              para que sepa que lo elegiste en esta hoja de ruta?
            </div>
            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                disabled={notifyBusy}
                onClick={() => void completeSaveAfterNotifyChoice(false)}
              >
                No notificar
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                disabled={notifyBusy}
                onClick={() => void completeSaveAfterNotifyChoice(true)}
              >
                {notifyBusy ? "Enviando…" : "Sí, notificar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mapPick ? (
        <div
          className={mapBackdropLayerAboveChatRail}
          role="dialog"
          aria-modal="true"
          aria-label="Coordenadas del mapa"
        >
          <div className={cn(modalShellWide, "max-w-[560px]")}>
            <div className="vt-modal-title">
              {mapPick.punto === "origen"
                ? "Origen del recorrido"
                : "Destino del recorrido"}{" "}
              (tramo {mapPick.tramoIndex + 1})
            </div>
            <div className={modalSub}>
              Tocá el mapa o escribí la dirección y usá «Buscar en el mapa». El
              texto y las coordenadas se actualizan entre sí; podés editar la
              dirección antes de guardar.
              {mapPick.punto === "destino" &&
              mapPick.tramoIndex > 0 &&
              destinoMapPrior?.endMarkers.length ? (
                <span className="mt-1 block text-[12px]">
                  Tramos anteriores con pin 1, 2, … y trazo: tocá un número para
                  fijar el fin de este tramo ahí, o elegí otro punto en el mapa.
                </span>
              ) : null}
            </div>
            <div
              className="mb-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[#e2e8f0] [&_.leaflet-container]:z-0 [&_.leaflet-control-attribution]:text-[10px]"
              style={{ minHeight: "min(52vh, 360px)" }}
            >
              <MapContainer
                key={`${mapPick.tramoIndex}-${mapPick.punto}`}
                center={routeMapCenter}
                zoom={routeMapZoom}
                className="h-[min(52vh,360px)] w-full"
                scrollWheelZoom
                attributionControl
              >
                <VibeMapTileLayer />
                <RouteMapCameraSync
                  defaultCenter={routeMapCenter}
                  defaultZoom={routeMapZoom}
                  pickPos={routeMapMarkerPos}
                  destinoPriorLine={destinoPriorLineForCamera}
                />
                {mapPick.punto === "destino" &&
                destinoMapPrior &&
                destinoMapPrior.linePositions.length >= 2 ? (
                  <LeafletRoadSnappedRoute
                    positions={destinoMapPrior.linePositions}
                    useRoads
                    fitMapToRoute={false}
                  />
                ) : null}
                {mapPick.punto === "destino" && destinoMapPrior
                  ? destinoMapPrior.endMarkers.map((m) => (
                      <Marker
                        key={`prior-${m.label}-${m.lat.toFixed(5)}-${m.lng.toFixed(5)}`}
                        position={[m.lat, m.lng]}
                        zIndexOffset={300}
                        icon={routeMapNumberedWaypointIcon(m.label)}
                        eventHandlers={{
                          click: () => {
                            setMapLat(formatPickedCoord(m.lat));
                            setMapLng(formatPickedCoord(m.lng));
                            setMapCoordError(undefined);
                            void nominatimReverse(m.lat, m.lng).then(
                              (label) => {
                                if (label) setMapPlaceLabel(label);
                              },
                            );
                          },
                        }}
                      />
                    ))
                  : null}
                <RouteMapClickHandler
                  onPick={(lat, lng) => {
                    setMapLat(formatPickedCoord(lat));
                    setMapLng(formatPickedCoord(lng));
                    setMapCoordError(undefined);
                  }}
                />
                {routeMapMarkerPos ? (
                  <Marker
                    position={[routeMapMarkerPos.lat, routeMapMarkerPos.lng]}
                    draggable
                    zIndexOffset={500}
                    icon={storeMapPinIcon()}
                    eventHandlers={{
                      dragend: (e) => {
                        const ll = e.target.getLatLng();
                        setMapLat(formatPickedCoord(ll.lat));
                        setMapLng(formatPickedCoord(ll.lng));
                        setMapCoordError(undefined);
                      },
                    }}
                  />
                ) : null}
              </MapContainer>
            </div>
            <div className={modalFormBody}>
              <label className={fieldRootWithInvalid(false)}>
                <span className={fieldLabel}>
                  {mapPick.punto === "origen"
                    ? "Origen (dirección)"
                    : "Destino (dirección)"}
                </span>
                <textarea
                  className="vt-input min-h-[72px] resize-y"
                  value={mapPlaceLabel}
                  onChange={(e) => setMapPlaceLabel(e.target.value)}
                  rows={3}
                  placeholder="Ej. Calle 23, La Habana"
                  autoComplete="street-address"
                />
              </label>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost text-[13px]"
                  onClick={() => void geocodePlaceToMap()}
                >
                  Buscar en el mapa
                </button>
              </div>
              <label className={fieldRootWithInvalid(!!mapCoordError)}>
                <span className={fieldLabel}>Latitud</span>
                <input
                  className="vt-input"
                  value={mapLat}
                  inputMode="decimal"
                  onChange={(e) => {
                    setMapLat(e.target.value);
                    setMapCoordError(undefined);
                  }}
                  aria-invalid={!!mapCoordError}
                />
              </label>
              <label className={fieldRootWithInvalid(!!mapCoordError)}>
                <span className={fieldLabel}>Longitud</span>
                <input
                  className="vt-input"
                  value={mapLng}
                  inputMode="decimal"
                  onChange={(e) => {
                    setMapLng(e.target.value);
                    setMapCoordError(undefined);
                  }}
                  aria-invalid={!!mapCoordError}
                />
              </label>
              {mapCoordError ? (
                <div className={fieldError} role="alert">
                  {mapCoordError}
                </div>
              ) : null}
            </div>
            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                onClick={() => {
                  mapForwardTokenRef.current += 1;
                  setMapPick(null);
                  setMapCoordError(undefined);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                onClick={applyMapCoords}
              >
                Guardar coordenadas
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
