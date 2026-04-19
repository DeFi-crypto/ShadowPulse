import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { DistressAsset } from "@/types";
import { severityColor, severityLabel } from "@/lib/utils";

interface WarMapProps {
  assets: DistressAsset[];
  selectedId: string | null;
  onSelect: (asset: DistressAsset) => void;
  mapboxToken?: string;
}

export function WarMap({ assets, selectedId, onSelect, mapboxToken }: WarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [ready, setReady] = useState(false);

  const tokenAvailable = Boolean(mapboxToken);

  useEffect(() => {
    if (!tokenAvailable || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken!;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98, 39],
      zoom: 3.5,
      pitch: 55,
      bearing: -15,
      antialias: true,
    });
    map.on("load", () => {
      map.addLayer({
        id: "building-3d",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 14,
        paint: {
          "fill-extrusion-color": "#1F252D",
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "min_height"],
          "fill-extrusion-opacity": 0.85,
        },
      });
      setReady(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, tokenAvailable]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const nextIds = new Set(assets.map((a) => a.asset_id));
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    assets.forEach((asset) => {
      const existing = markersRef.current.get(asset.asset_id);
      if (existing) {
        existing.setLngLat([asset.lng, asset.lat]);
        updateMarkerEl(existing.getElement(), asset, asset.asset_id === selectedId);
        return;
      }
      const el = createMarkerEl(asset, asset.asset_id === selectedId);
      el.addEventListener("click", () => onSelect(asset));
      el.addEventListener("mouseenter", () => showPopup(map, asset));
      el.addEventListener("mouseleave", () => hidePopup());
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([asset.lng, asset.lat])
        .addTo(map);
      markersRef.current.set(asset.asset_id, marker);
    });

    if (assets.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      assets.forEach((a) => bounds.extend([a.lng, a.lat]));
      map.fitBounds(bounds, {
        padding: 120,
        maxZoom: 13,
        duration: 1200,
      });
    }
  }, [assets, ready, selectedId, onSelect]);

  useEffect(() => {
    const selected = assets.find((a) => a.asset_id === selectedId);
    if (!selected || !mapRef.current || !ready) return;
    mapRef.current.flyTo({
      center: [selected.lng, selected.lat],
      zoom: 14.5,
      pitch: 62,
      bearing: -18,
      duration: 1600,
      essential: true,
    });
  }, [selectedId, assets, ready]);

  if (!tokenAvailable) {
    return <FallbackMap assets={assets} selectedId={selectedId} onSelect={onSelect} />;
  }

  return <div ref={containerRef} className="h-full w-full" />;
}

function createMarkerEl(asset: DistressAsset, selected: boolean) {
  const el = document.createElement("div");
  el.className = "sp-marker";
  updateMarkerEl(el, asset, selected);
  return el;
}

function updateMarkerEl(el: HTMLElement, asset: DistressAsset, selected: boolean) {
  const color = severityColor(asset.distress_score);
  const size = selected ? 22 : 16;
  el.style.cssText = `
    position: relative;
    width: ${size}px;
    height: ${size}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  el.innerHTML = `
    <span style="
      position: absolute; inset: 0;
      border-radius: 9999px;
      background: ${color};
      opacity: 0.25;
      animation: sp-ring ${asset.distress_score >= 70 ? "1.2s" : "1.8s"} ease-out infinite;
    "></span>
    <span style="
      position: relative;
      width: ${size * 0.55}px;
      height: ${size * 0.55}px;
      border-radius: 9999px;
      background: ${color};
      box-shadow: 0 0 12px ${color}, 0 0 2px #0B0E11;
      border: 1.5px solid #0B0E11;
    "></span>
  `;
}

let popupRef: mapboxgl.Popup | null = null;

function showPopup(map: mapboxgl.Map, asset: DistressAsset) {
  hidePopup();
  const flags = asset.top_red_flags.slice(0, 3);
  const color = severityColor(asset.distress_score);
  popupRef = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 18,
  })
    .setLngLat([asset.lng, asset.lat])
    .setHTML(
      `
      <div style="min-width: 220px; font-family: Inter, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-weight: 600; font-size: 12px; color: #F3F4F6;">${asset.owner_reit}</div>
          <div style="font-family: 'JetBrains Mono'; font-size: 11px; color: ${color};">${asset.distress_score.toFixed(0)} · ${severityLabel(asset.distress_score)}</div>
        </div>
        <div style="font-size: 11px; color: #9CA3AF; margin-bottom: 8px;">${asset.address}</div>
        <div style="font-size: 10px; color: #CBD5E1; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">Top Red Flags</div>
        <ul style="margin: 0; padding: 0 0 0 14px; font-size: 11px; color: #E5E7EB;">
          ${flags.map((f) => `<li style="margin-bottom: 2px;">${f}</li>`).join("")}
        </ul>
      </div>
    `,
    )
    .addTo(map);
}

function hidePopup() {
  popupRef?.remove();
  popupRef = null;
}

function FallbackMap({
  assets,
  selectedId,
  onSelect,
}: {
  assets: DistressAsset[];
  selectedId: string | null;
  onSelect: (a: DistressAsset) => void;
}) {
  const viewBox = useMemo(() => {
    const lngs = assets.map((a) => a.lng);
    const lats = assets.map((a) => a.lat);
    const minX = Math.min(...lngs, -125);
    const maxX = Math.max(...lngs, -66);
    const minY = Math.min(...lats, 24);
    const maxY = Math.max(...lats, 50);
    const padX = (maxX - minX) * 0.05;
    const padY = (maxY - minY) * 0.05;
    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
  }, [assets]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-charcoal-900">
      <GridBackdrop />
      <div className="absolute top-3 left-3 z-10 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-yellow-300">
        Mapbox token missing · rendering fallback topology
      </div>
      <svg
        viewBox={`${viewBox.minX} ${-viewBox.maxY} ${viewBox.maxX - viewBox.minX} ${viewBox.maxY - viewBox.minY}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {assets.map((asset) => {
          const color = severityColor(asset.distress_score);
          const selected = asset.asset_id === selectedId;
          const cx = asset.lng;
          const cy = -asset.lat;
          const r = (asset.distress_score / 100) * 0.6 + 0.1;
          return (
            <g
              key={asset.asset_id}
              transform={`translate(${cx}, ${cy})`}
              onClick={() => onSelect(asset)}
              style={{ cursor: "pointer" }}
            >
              <circle r={r * 2.5} fill={color} opacity={0.12}>
                <animate
                  attributeName="r"
                  values={`${r};${r * 3.5};${r}`}
                  dur={asset.distress_score >= 70 ? "1.4s" : "2.2s"}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.35;0;0.35"
                  dur={asset.distress_score >= 70 ? "1.4s" : "2.2s"}
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                r={selected ? r * 1.4 : r}
                fill={color}
                stroke="#0B0E11"
                strokeWidth={0.06}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GridBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-20 pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="#374151"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}
