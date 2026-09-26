import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Linking, Platform, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { apiGet, apiPost } from '../lib/api';

const hhmm = (d) => d ? new Date(d).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function Home() {
  const [usuario, setUsuario] = useState(null);
  const [miMovil, setMiMovil] = useState(null);
  const [servicio, setServicio] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');

  const [compartiendo, setCompartiendo] = useState(false);
  const [pos, setPos] = useState(null);
  const [ultimoEnvio, setUltimoEnvio] = useState(null);
  const subRef = useRef(null);

  const [ruta, setRuta] = useState(null);
  const [destResuelto, setDestResuelto] = useState(null);
  const [rutaMsg, setRutaMsg] = useState('');

  const s = servicio?.solicitud;
  const destinoCoords = s && s.latitud != null && s.longitud != null ? { lat: Number(s.latitud), lng: Number(s.longitud) } : null;
  const destinoTexto = s ? ([s.direccion, s.barrio, s.ciudad].filter(Boolean).join(', ') || s.solicitud_traslado?.destino || '') : '';
  const motivo = s?.solicitud_emergencia?.motivo_consulta?.nombre || s?.tipo_solicitud?.nombre || '';

  const cargar = async () => {
    try {
      const [mv, servs] = await Promise.all([
        apiGet('/api/ubicacion/mi-movil').catch(() => null),
        apiGet('/api/servicios/mios').catch(() => []),
      ]);
      setMiMovil(mv);
      const activo = Array.isArray(servs) ? servs.find(d => ![4, 5].includes(d.estado_despacho_id)) : null;
      setServicio(activo || null);
    } catch (e) { setMsg(e.message); } finally { setCargando(false); }
  };

  useEffect(() => {
    (async () => {
      try { setUsuario(JSON.parse((await AsyncStorage.getItem('usuario')) || '{}')); } catch {}
      cargar();
    })();
    return () => { subRef.current?.remove(); };
  }, []);

  const toggleCompartir = async () => {
    if (compartiendo) {
      subRef.current?.remove(); subRef.current = null; setCompartiendo(false); return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setMsg('Permiso de ubicación denegado. Activalo para compartir tu posición.'); return; }
    setMsg('');
    setCompartiendo(true);
    subRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 30 },
      async (loc) => {
        const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setPos(p);
        try { await apiPost('/api/ubicacion', { latitud: p.lat, longitud: p.lng }); setUltimoEnvio(new Date()); } catch {}
      },
      (err) => setMsg('Error de GPS: ' + err.message)
    );
  };

  const calcularRuta = async () => {
    setRutaMsg('Calculando ruta…'); setRuta(null);
    try {
      let origen = pos;
      if (!origen) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setRutaMsg('Necesito permiso de ubicación para calcular la ruta.'); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        origen = { lat: loc.coords.latitude, lng: loc.coords.longitude }; setPos(origen);
      }
      let dest = destinoCoords;
      if (!dest) {
        if (!destinoTexto) { setRutaMsg('El servicio no tiene destino con dirección ni coordenadas.'); return; }
        const g = await apiGet(`/api/geo/geocode?q=${encodeURIComponent(destinoTexto)}`);
        dest = { lat: g.lat, lng: g.lng };
      }
      setDestResuelto(dest);
      const r = await apiGet(`/api/geo/ruta?o=${origen.lat},${origen.lng}&d=${dest.lat},${dest.lng}`);
      setRuta(r); setRutaMsg('');
    } catch (e) { setRutaMsg(e.message || 'No se pudo calcular la ruta'); }
  };

  const navegar = () => {
    const dest = destResuelto || destinoCoords;
    let url;
    if (dest) {
      url = Platform.select({
        ios: `maps://?daddr=${dest.lat},${dest.lng}`,
        android: `google.navigation:q=${dest.lat},${dest.lng}`,
      });
    } else if (destinoTexto) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinoTexto)}`;
    }
    if (!url) { setRutaMsg('No hay destino para navegar.'); return; }
    Linking.openURL(url).catch(() => {
      const q = dest ? `${dest.lat},${dest.lng}` : encodeURIComponent(destinoTexto);
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`);
    });
  };

  const salir = async () => {
    subRef.current?.remove();
    await AsyncStorage.multiRemove(['token', 'usuario']);
    router.replace('/');
  };

  if (cargando) return <View style={st.center}><ActivityIndicator size="large" color="#0a2540" /></View>;

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ padding: 16, paddingTop: 52 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
      <View style={st.top}>
        <View>
          <Text style={st.hola}>{usuario?.nombre ?? 'Tripulación'}</Text>
          <Text style={st.rol}>{usuario?.rol ?? ''}</Text>
        </View>
        <TouchableOpacity onPress={salir}><Text style={st.salir}>Salir</Text></TouchableOpacity>
      </View>

      {msg ? <Text style={st.msg}>{msg}</Text> : null}

      <View style={st.card}>
        <Text style={st.cardTit}>🚑 Mi móvil</Text>
        {miMovil ? (
          <Text style={st.big}>{miMovil.cod_movil} <Text style={st.small}>· Guardia {miMovil.guardia_codigo}</Text></Text>
        ) : (
          <Text style={st.small}>No estás asignado a un móvil en una guardia activa.</Text>
        )}
      </View>

      <View style={[st.card, { borderColor: compartiendo ? '#15803d' : '#e5e7eb' }]}>
        <Text style={st.cardTit}>Ubicación</Text>
        <Text style={st.small}>
          {compartiendo ? `Compartiendo · último envío ${hhmm(ultimoEnvio)}` : 'No estás compartiendo tu ubicación.'}
        </Text>
        {pos ? <Text style={st.coord}>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</Text> : null}
        <TouchableOpacity style={[st.btn, { backgroundColor: compartiendo ? '#dc2626' : '#15803d' }]} onPress={toggleCompartir} activeOpacity={0.85}>
          <Text style={st.btnTxt}>{compartiendo ? '■ Dejar de compartir' : '● Compartir ubicación'}</Text>
        </TouchableOpacity>
      </View>

      <View style={st.card}>
        <Text style={st.cardTit}>Servicio asignado</Text>
        {servicio ? (
          <>
            <Text style={st.big}>#{s?.id} {motivo ? `· ${motivo}` : ''}</Text>
            <Text style={st.small}>📍 {destinoTexto || 'Sin dirección'}</Text>
            {ruta ? (
              <View style={st.eta}>
                <Text style={st.etaTxt}>🛣️ {ruta.distancia_km} km · ⏱️ {ruta.duracion_min} min (ETA)</Text>
              </View>
            ) : null}
            {rutaMsg ? <Text style={st.small}>{rutaMsg}</Text> : null}
            <View style={st.row}>
              <TouchableOpacity style={[st.btn, st.flex, { backgroundColor: '#0a2540' }]} onPress={calcularRuta} activeOpacity={0.85}>
                <Text style={st.btnTxt}>Calcular ruta / ETA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, st.flex, { backgroundColor: '#1d4ed8' }]} onPress={navegar} activeOpacity={0.85}>
                <Text style={st.btnTxt}>Navegar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={st.small}>No tenés un servicio activo en este momento.</Text>
        )}
      </View>

      <Text style={st.pie}>Deslizá hacia abajo para actualizar.</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  screen: { flex: 1, backgroundColor: '#f4f6f9' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  hola: { fontSize: 18, fontWeight: '700', color: '#0a2540' },
  rol: { fontSize: 12, color: '#6b7280' },
  salir: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
  msg: { backgroundColor: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginBottom: 14 },
  cardTit: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  big: { fontSize: 18, fontWeight: '700', color: '#0a2540', marginBottom: 4 },
  small: { fontSize: 13, color: '#6b7280' },
  coord: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  btn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  eta: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginTop: 8 },
  etaTxt: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
  pie: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 4 },
});
