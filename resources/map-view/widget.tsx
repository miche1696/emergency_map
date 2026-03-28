import {
  McpUseProvider,
  ModelContext,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "../styles.css";
import { propSchema, type MapViewProps, type Marker, type RouteGuide } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive Leaflet safety map with incidents, route markers, and place details",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    invoking: "Loading map...",
    invoked: "Map ready",
    csp: {
      // ChatGPT ignores wildcard entries in widget CSP; use exact origins only.
      resourceDomains: ["https://tile.openstreetmap.org"],
      connectDomains: ["https://tile.openstreetmap.org"],
      redirectDomains: ["https://www.google.com"],
    },
  },
};

const MARKER_COLORS: Record<string, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#2ecc71",
  orange: "#f39c12",
  purple: "#9b59b6",
};

type PlaceDetails = {
  name: string;
  population: string;
  timezone: string;
  country: string;
  funFacts: string[];
  coordinates: { lat: number; lng: number };
};

const FALLBACK_ROUTE_GUIDE: RouteGuide = {
  title: "Point A to Point B",
  summary: "Follow the visible checkpoint chain from the blue start marker to the purple destination marker.",
  eta: "Simulated ETA unavailable",
  steps: [
    "Start at Point A and move toward the first visible green checkpoint.",
    "Stay on the green checkpoint chain and keep distance from red and orange incident markers.",
    "Finish at Point B, marked as Gateway X on the map.",
  ],
  disclaimer:
    "Simulated route only. Mock map data must not guide real-world movement decisions.",
};

function buildViewKey(center: MapViewProps["center"], zoom: number): string {
  return `${center.lat}:${center.lng}:${zoom}`;
}

function stopHostGestureCapture(element: HTMLElement): () => void {
  const stopPropagation = (event: Event) => {
    event.stopPropagation();
  };
  const listenerOptions = { capture: true };

  const eventNames = [
    "wheel",
    "dblclick",
    "mousedown",
    "mousemove",
    "mouseup",
    "pointerdown",
    "pointermove",
    "pointerup",
    "touchstart",
    "touchmove",
    "touchend",
  ] as const;

  for (const eventName of eventNames) {
    element.addEventListener(eventName, stopPropagation, listenerOptions);
  }

  return () => {
    for (const eventName of eventNames) {
      element.removeEventListener(eventName, stopPropagation, listenerOptions);
    }
  };
}

const MapView: React.FC = () => {
  const {
    props,
    isPending,
    displayMode,
    requestDisplayMode,
    openExternal,
  } = useWidget<MapViewProps>();

  const {
    callTool: getPlaceDetails,
    data: placeData,
    isPending: isLoadingDetails,
  } = useCallTool("get-place-details");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const leafletLoading = useRef(false);
  const appliedViewRef = useRef<string>("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [viewBounds, setViewBounds] = useState<string>("");

  const placeDetails = placeData?.structuredContent as PlaceDetails | undefined;

  useEffect(() => {
    if (leafletLoading.current) return;
    leafletLoading.current = true;

    // Load Leaflet once and keep the CSS import static so the host always receives it.
    import("leaflet").then((L) => {
      leafletRef.current = L;
      setScriptLoaded(true);
    });
  }, []);

  const updateBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const b = mapInstanceRef.current.getBounds();
    setViewBounds(
      `SW(${b.getSouth().toFixed(2)},${b.getWest().toFixed(2)}) ` +
        `NE(${b.getNorth().toFixed(2)},${b.getEast().toFixed(2)})`
    );
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Keep wheel and drag gestures inside the map instead of letting the host page steal them.
    return stopHostGestureCapture(mapContainerRef.current);
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    if (!scriptLoaded || !mapContainerRef.current || isPending || !L || mapInstanceRef.current) return;
    if (!props.center) return;

    const center = props.center;
    const zoom = props.zoom ?? 12;
    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      keyboard: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    appliedViewRef.current = buildViewKey(center, zoom);

    map.on("moveend", updateBounds);
    map.on("zoomend", updateBounds);
    map.whenReady(() => {
      map.invalidateSize();
      updateBounds();
    });

    return () => {
      map.off("moveend", updateBounds);
      map.off("zoomend", updateBounds);
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      appliedViewRef.current = "";
    };
  }, [scriptLoaded, isPending, updateBounds]);

  useEffect(() => {
    if (!mapInstanceRef.current || isPending) return;
    if (!props.center) return;

    const center = props.center;
    const zoom = props.zoom ?? 12;
    const nextViewKey = buildViewKey(center, zoom);

    // Only recenter when the tool sends a different viewport.
    if (appliedViewRef.current === nextViewKey) return;

    mapInstanceRef.current.setView([center.lat, center.lng], zoom);
    appliedViewRef.current = nextViewKey;
  }, [isPending, props.center?.lat, props.center?.lng, props.zoom]);

  useEffect(() => {
    const L = leafletRef.current;
    if (!mapInstanceRef.current || !markersLayerRef.current || isPending || !L) return;
    const { markers } = props;

    markersLayerRef.current.clearLayers();

    markers.forEach((m: Marker) => {
      const color = MARKER_COLORS[m.color ?? "blue"] ?? MARKER_COLORS.blue;

      const circleMarker = L.circleMarker([m.lat, m.lng], {
        radius: 10,
        fillColor: color,
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      });

      const popupContent = `<div style="min-width:120px">
        <strong style="font-size:14px">${m.title}</strong>
        ${m.description ? `<p style="margin:4px 0 0;font-size:12px;color:#666">${m.description}</p>` : ""}
      </div>`;

      circleMarker.bindPopup(popupContent);
      circleMarker.on("click", () => {
        setSelectedMarker(m);
        getPlaceDetails({ name: m.title });
      });

      markersLayerRef.current.addLayer(circleMarker);
    });

    updateBounds();
  }, [isPending, props?.markers, updateBounds]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();
  }, [displayMode, selectedMarker]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;

    // The host can resize the widget after mount, so keep Leaflet in sync with the container box.
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });

    observer.observe(mapContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [scriptLoaded]);

  const handleDirections = useCallback(
    (marker: Marker) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`;
      openExternal(url);
    },
    [openExternal]
  );

  const isFullscreen = displayMode === "fullscreen";
  const mapHeight = isFullscreen ? "calc(100vh - 60px)" : "400px";

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading map...
            </span>
          </div>
          <div
            className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            style={{ height: "360px" }}
          />
        </div>
      </McpUseProvider>
    );
  }

  const { title, markers } = props;
  const guide = props.guide ?? FALLBACK_ROUTE_GUIDE;

  return (
    <McpUseProvider autoSize>
      <ModelContext content={`Map viewport: ${viewBounds}`}>
        {selectedMarker && (
          <ModelContext
            content={`Selected marker: "${selectedMarker.title}" at ${selectedMarker.lat},${selectedMarker.lng}`}
          />
        )}
      </ModelContext>

      <div className="flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {title}
              </h3>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {markers.length} marker{markers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isFullscreen ? (
              <button
                onClick={() => requestDisplayMode("fullscreen")}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Fullscreen
              </button>
            ) : (
              <button
                onClick={() => requestDisplayMode("inline")}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* Persistent guide card so the route stays visible while the widget is in use. */}
        <RouteGuideCard guide={guide} />

        {/* Map + side panel layout */}
        <div className="flex" style={{ height: mapHeight }}>
          <div className="map-shell flex-1 min-w-0">
            <div ref={mapContainerRef} className="map-canvas relative z-0" />
          </div>

          {/* Side panel — place details */}
          {selectedMarker && (
            <div className="w-64 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-900">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedMarker.title}
                  </h4>
                  <button
                    onClick={() => setSelectedMarker(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none -mt-0.5"
                  >
                    ×
                  </button>
                </div>

                {selectedMarker.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {selectedMarker.description}
                  </p>
                )}

                {isLoadingDetails ? (
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  </div>
                ) : placeDetails ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Country
                      </span>
                      <p className="text-xs text-gray-800 dark:text-gray-200">
                        {placeDetails.country}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Population
                      </span>
                      <p className="text-xs text-gray-800 dark:text-gray-200">
                        {placeDetails.population}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Timezone
                      </span>
                      <p className="text-xs text-gray-800 dark:text-gray-200">
                        {placeDetails.timezone}
                      </p>
                    </div>

                    {placeDetails.funFacts?.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Fun facts
                        </span>
                        <ul className="mt-1 space-y-1">
                          {placeDetails.funFacts.map((fact, i) => (
                            <li
                              key={i}
                              className="text-xs text-gray-600 dark:text-gray-400 flex gap-1.5"
                            >
                              <span className="text-blue-500 mt-px shrink-0">•</span>
                              {fact}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                <button
                  onClick={() => handleDirections(selectedMarker)}
                  className="mt-4 w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  Open in Google Maps
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </McpUseProvider>
  );
};

function RouteGuideCard({ guide }: { guide: RouteGuide }) {
  return (
    <div className="px-4 py-3 border-b border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
            Simulated route guide
          </p>
          <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-100 truncate">
            {guide.title}
          </h4>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-amber-800 shadow-sm dark:bg-amber-900/60 dark:text-amber-100">
          {guide.eta}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-amber-900 dark:text-amber-100">
        {guide.summary}
      </p>

      <ol className="mt-3 space-y-1.5">
        {guide.steps.map((step, index) => (
          <li key={step} className="flex gap-2 text-xs leading-5 text-amber-900 dark:text-amber-100">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-900 text-[10px] font-semibold text-amber-50 dark:bg-amber-200 dark:text-amber-950">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[11px] leading-4 text-amber-700 dark:text-amber-300">
        {guide.disclaimer}
      </p>
    </div>
  );
}

export default MapView;
