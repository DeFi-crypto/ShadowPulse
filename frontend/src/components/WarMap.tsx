import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl";
import type { DistressAsset } from "@/types";
import { severityColor, severityLabel } from "@/lib/utils";

interface WarMapProps {
  assets: DistressAsset[];
  selectedId: string | null;
  onSelect: (asset: DistressAsset) => void;
}

// CartoDB "Voyager" raster tiles - a colorful, readable basemap with
// labels, water, roads, and landcover in natural tones. No API key needed.
const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-voyager",
      type: "raster",
      source: "carto-voyager",
    },
  ],
};

export function WarMap({ assets, selectedId, onSelect }: WarMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [-90, 39],
      zoom: 3.2,
      pitch: 35,
      bearing: -10,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.on("load", () => setReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
        updateMarkerEl(
          existing.getElement(),
          asset,
          asset.asset_id === selectedId,
        );
        return;
      }
      const el = createMarkerEl(asset, asset.asset_id === selectedId);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(asset);
      });
      el.addEventListener("mouseenter", () => showPopup(map, asset));
      el.addEventListener("mouseleave", () => hidePopup());
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([asset.lng, asset.lat])
        .addTo(map);
      markersRef.current.set(asset.asset_id, marker);
    });

    if (assets.length > 0) {
      const bounds = new maplibregl.LngLatBounds(
        [assets[0].lng, assets[0].lat],
        [assets[0].lng, assets[0].lat],
      );
      assets.forEach((a) => bounds.extend([a.lng, a.lat]));
      map.fitBounds(bounds, {
        padding: { top: 120, bottom: 80, left: 80, right: 80 },
        maxZoom: 11,
        duration: 1200,
      });
    }
  }, [assets, ready, selectedId, onSelect]);

  useEffect(() => {
    const selected = assets.find((a) => a.asset_id === selectedId);
    if (!selected || !mapRef.current || !ready) return;
    mapRef.current.flyTo({
      center: [selected.lng, selected.lat],
      zoom: 13.5,
      pitch: 55,
      bearing: -18,
      duration: 1600,
      essential: true,
    });
  }, [selectedId, assets, ready]);

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
  const size = selected ? 24 : 16;
  el.style.cssText = `
    position: relative;
    width: ${size}px;
    height: ${size}px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  `;
  el.innerHTML = `
    <span style="
      position: absolute; inset: 0;
      border-radius: 9999px;
      background: ${color};
      opacity: 0.35;
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

let popupRef: Popup | null = null;

function showPopup(map: MLMap, asset: DistressAsset) {
  hidePopup();
  const flags = asset.top_red_flags.slice(0, 3);
  const color = severityColor(asset.distress_score);
  popupRef = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 18,
    className: "sp-popup",
  })
    .setLngLat([asset.lng, asset.lat])
    .setHTML(
      `
      <div style="min-width: 220px; font-family: Inter, sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 12px;">
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
