import { useEffect, useState } from 'react';
import { MapContainer, CircleMarker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import moment from 'moment';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEFAULT_LOCATION } from '@/api/weather';
import { gpsRiskColors, gpsRiskLabels } from '@/lib/labels';

// Mapa base: OpenFreeMap — gratuito, sem chave e liberado para uso comercial.
const BASE_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const BASE_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Dados de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

// Radar: RainViewer (gratuito; tiles até o zoom 7, ampliados nos zooms maiores).
const RADAR_INDEX = 'https://api.rainviewer.com/public/weather-maps.json';
const RADAR_MAX_NATIVE_ZOOM = 7;

function VectorBaseLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = maplibreGL({ style: BASE_STYLE, attribution: BASE_ATTRIBUTION, interactive: false }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);
  return null;
}

/** Último quadro do radar de chuva; atualiza a cada 10 minutos. */
export function useRadarFrame(enabled) {
  const [frame, setFrame] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(RADAR_INDEX);
        const data = await res.json();
        const last = data.radar?.past?.at(-1);
        if (!cancelled && last) setFrame({ url: `${data.host}${last.path}/256/{z}/{x}/{y}/2/1_1.png`, time: last.time });
      } catch {
        /* radar indisponível: o mapa segue sem a camada */
      }
    };
    load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled]);
  return frame;
}

function FitView({ points, selected }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });
    } else if (points.length > 1) {
      map.fitBounds(points.map((p) => [p.latitude, p.longitude]), { padding: [30, 30], maxZoom: 15 });
    }
  }, [map, points, selected]);
  return null;
}

/**
 * Mapa escuro com o trajeto e marcadores coloridos por risco.
 * `points` deve vir ordenado do mais recente para o mais antigo (o primeiro é a posição atual).
 */
export default function RiskMap({ points, selectedId, onSelect, compact = false, radar = false }) {
  const latest = points[0];
  const center = latest ? [latest.latitude, latest.longitude] : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];
  const selected = points.find((p) => p.id === selectedId);
  const route = [...points].reverse().map((p) => [p.latitude, p.longitude]);
  const radarFrame = useRadarFrame(radar);

  return (
    <MapContainer
      center={center}
      zoom={13}
      maxZoom={18}
      style={{ height: '100%', width: '100%', background: '#0f172a' }}
      zoomControl={!compact}
      attributionControl={!compact}
      scrollWheelZoom={!compact}
    >
      <VectorBaseLayer />
      {radar && radarFrame && (
        <TileLayer
          key={radarFrame.url}
          url={radarFrame.url}
          opacity={0.6}
          maxNativeZoom={RADAR_MAX_NATIVE_ZOOM}
          maxZoom={18}
          zIndex={300}
          attribution='Radar © <a href="https://www.rainviewer.com" target="_blank" rel="noopener">RainViewer</a>'
        />
      )}
      <FitView points={points} selected={selected} />
      {route.length > 1 && (
        <Polyline positions={route} pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.7, dashArray: '6 6' }} />
      )}
      {[...points].reverse().map((p) => {
        const isCurrent = p.id === latest?.id;
        const isSelected = p.id === selectedId;
        const color = gpsRiskColors[p.risk_level] ?? gpsRiskColors.safe;
        return (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={isCurrent ? 10 : isSelected ? 9 : 6}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              weight: isCurrent || isSelected ? 3 : 1.5,
              fillColor: color,
              fillOpacity: isCurrent ? 0.85 : 0.45,
            }}
            eventHandlers={onSelect ? { click: () => onSelect(p.id) } : undefined}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{p.location_name}</p>
                <p>{moment(p.timestamp).format('DD/MM/YYYY HH:mm')}</p>
                <p>
                  Risco: <span style={{ color }}>{gpsRiskLabels[p.risk_level]}</span>
                  {isCurrent && ' · posição atual'}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
