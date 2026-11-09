/**
 * Clima no navegador: localização do dispositivo + nome do local.
 * O cálculo climático (leituras, riscos, alertas, granizo) fica no núcleo
 * compartilhado com o servidor de notificações.
 */
export * from '../../supabase/functions/_shared/climate.js';

export function getDeviceLocation(timeout = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const d = await res.json();
    const city = d.city || d.locality;
    const uf = (d.principalSubdivisionCode || '').split('-')[1] || d.principalSubdivision;
    if (city) return uf ? `${city}, ${uf}` : city;
  } catch {
    /* sem rede ou serviço indisponível: usa coordenadas */
  }
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}
