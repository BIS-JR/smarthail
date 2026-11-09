import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import moment from 'moment';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_LOCATION } from '@/api/weather';
import { gpsRiskColors, gpsRiskLabels } from '@/lib/labels';

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
 * Mapa Leaflet escuro (CartoDB) com o trajeto e marcadores coloridos por risco.
 * `points` deve vir ordenado do mais recente para o mais antigo (o primeiro é a posição atual).
 */
export default function RiskMap({ points, selectedId, onSelect, compact = false }) {
  const latest = points[0];
  const center = latest ? [latest.latitude, latest.longitude] : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng];
  const selected = points.find((p) => p.id === selectedId);
  const route = [...points].reverse().map((p) => [p.latitude, p.longitude]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%', background: '#0f172a' }}
      zoomControl={!compact}
      attributionControl={!compact}
      scrollWheelZoom={!compact}
    >
      {/* Tiles do OpenStreetMap (sem chave) escurecidos via CSS — ver .dark-tiles em index.css */}
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-tiles"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
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
