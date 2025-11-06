// main.js
const el = id => document.getElementById(id);

const state = {
    lat: null,
    lon: null,
    city: null,
    timezone: null,
    sunrise: null,
    sunset: null,
    scheduled: []
};

// Mapa de códigos de clima
const weatherCodeMap = {
    0: 'Céu limpo', 1: 'Principalmente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Neblina', 48: 'Nevoeiro com gelo', 51: 'Chuvisco leve', 53: 'Chuvisco moderado',
    55: 'Chuvisco forte', 61: 'Chuva fraca', 63: 'Chuva moderada', 65: 'Chuva forte',
    71: 'Neve fraca', 73: 'Neve moderada', 75: 'Neve forte', 80: 'Chuva esporádica',
    81: 'Chuva intensa', 82: 'Chuva muito intensa', 95: 'Trovoadas', 96: 'Trovoadas com granizo'
};

// Atualiza status
function setStatus(msg) {
    el('status').textContent = msg;
}

// Formata data e hora
function fmtDateISO(d) {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: state.timezone }).format(d);
}
function fmtTimeISO(s) {
    if (!s) return '—';
    const d = new Date(s);
    return new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: state.timezone }).format(d);
}

// Reverse geocode para cidade
async function reverseGeocode(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=pt-BR`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const address = data.address || {};
        return address.city || address.town || address.village || address.county || address.state || data.display_name || "Local desconhecido";
    } catch (e) {
        console.warn('Falha reverse geocode', e);
        return null;
    }
}

// Busca clima com umidade
async function fetchWeather(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m&daily=sunrise,sunset&timezone=auto&temperature_unit=celsius&windspeed_unit=kmh`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Erro Open-Meteo: ' + res.status);
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// Atualiza relógio local
function updateClockDisplay() {
    const now = new Date();
    el('local-time').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'medium', timeZone: state.timezone || undefined }).format(now);
    el('todayDate').textContent = fmtDateISO(now);
}

// Limpa timers
function clearScheduled() {
    state.scheduled.forEach(id => clearTimeout(id));
    state.scheduled = [];
    el('alerts-list').textContent = '—';
}

// Agenda alertas
function scheduleSunsetAlerts(sunsetISO) {
    clearScheduled();
    if (!sunsetISO) return;
    const sunset = new Date(sunsetISO);
    const before5 = new Date(sunset.getTime() - 5 * 60 * 1000);
    const before1 = new Date(sunset.getTime() - 1 * 60 * 1000);
    const now = new Date();
    const alerts = [];

    if (before5 > now) {
        const t = setTimeout(() => notifyLocal('Pôr do sol em 5 minutos', `O pôr do sol acontece às ${fmtTimeISO(sunsetISO)}`), before5 - now);
        state.scheduled.push(t);
        alerts.push('5 min antes: ' + fmtTimeISO(before5.toISOString()));
    } else alerts.push('5 min antes: já passou');

    if (before1 > now) {
        const t1 = setTimeout(() => notifyLocal('Pôr do sol em 1 minuto', `Faltam 1 minuto para o pôr do sol às ${fmtTimeISO(sunsetISO)}`), before1 - now);
        state.scheduled.push(t1);
        alerts.push('1 min antes: ' + fmtTimeISO(before1.toISOString()));
    } else alerts.push('1 min antes: já passou');

    if (sunset > now) alerts.push('Pôr do sol: ' + fmtTimeISO(sunsetISO));
    else alerts.push('Pôr do sol já ocorreu hoje');

    el('alerts-list').innerHTML = alerts.join('<br>');
}

// Beep
function playBeep() {
    try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.value = 0.02;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => { o.stop(); ctx.close(); }, 700);
    } catch (e) { }
}

// Notificação local
async function notifyLocal(title, body) {
    if (Notification.permission === 'granted') {
        try { new Notification(title, { body, tag: 'sunset-alert', silent: false }); } 
        catch (e) { console.warn('Erro notificação', e); }
    }
    playBeep();
}

// Solicita permissão
async function requestNotificationPermission() {
    if (!('Notification' in window)) { alert('Seu navegador não suporta notificações.'); return; }
    if (Notification.permission === 'default') {
        try {
            const p = await Notification.requestPermission();
            if (p === 'granted') alert('Notificações ativadas!');
            else alert('Notificações negadas — habilite nas configurações do navegador.');
        } catch (e) { console.warn(e); }
    } else { alert('Permissão de notificação: ' + Notification.permission); }
}

// Atualiza tudo
async function refreshAll() {
    setStatus('Obtendo localização...');
    if (!navigator.geolocation) {
        setStatus('Geolocalização indisponível');
        el('city').textContent = 'Geolocalização não suportada';
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        state.lat = lat; state.lon = lon;
        el('coords').textContent = `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`;

        setStatus('Buscando cidade...');
        const city = await reverseGeocode(lat, lon);
        state.city = city || 'Cidade desconhecida';
        el('city').textContent = state.city;

        setStatus('Consultando clima...');
        const w = await fetchWeather(lat, lon);
        if (!w) { setStatus('Erro ao obter clima'); return; }

        state.timezone = w.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        const cw = w.current || {};
        const daily = w.daily || {};
        state.sunrise = daily.sunrise?.[0] || null;
        state.sunset = daily.sunset?.[0] || null;

        el('temperature').textContent = cw.temperature_2m !== undefined ? Math.round(cw.temperature_2m) + '°C' : '—';
        el('weather-desc').textContent = cw.weathercode !== undefined
            ? (weatherCodeMap[cw.weathercode] || '—') + ' · vento ' + Math.round(cw.windspeed_10m || 0) + ' km/h'
            : '—';
        el('wind').textContent = cw.windspeed_10m !== undefined ? Math.round(cw.windspeed_10m) + ' km/h' : '—';
        el('humidity').textContent = cw.relative_humidity_2m !== undefined ? Math.round(cw.relative_humidity_2m) + '%' : '—';
        el('sunrise').textContent = state.sunrise ? fmtTimeISO(state.sunrise) : '—';
        el('sunset').textContent = state.sunset ? fmtTimeISO(state.sunset) : '—';
        el('notes').textContent = 'Dados atualizados — timezone: ' + (state.timezone || 'desconhecido');

        setStatus('Pronto');
        scheduleSunsetAlerts(state.sunset);
        updateClockDisplay();
    }, (err) => {
        console.error('Erro geoloc', err);
        setStatus('Permissão de localização negada ou falha');
        el('city').textContent = 'Permissão negada';
    }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
}

// Contagem regressiva
function updateCountdownLoop() {
    if (!state.sunset) { el('countdown').textContent = '—'; updateClockDisplay(); return; }
    const now = new Date();
    const sunset = new Date(state.sunset);
    let diff = sunset - now;
    if (diff <= 0) el('countdown').textContent = 'Pôr do sol já ocorreu';
    else {
        const h = Math.floor(diff / 3600000);
        diff %= 3600000;
        const m = Math.floor(diff / 60000);
        diff %= 60000;
        const s = Math.floor(diff / 1000);
        el('countdown').textContent = `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
    updateClockDisplay();
}

// Eventos
el('refresh').addEventListener('click', refreshAll);
el('locate').addEventListener('click', refreshAll);
el('enable-notif').addEventListener('click', requestNotificationPermission);

refreshAll();
setInterval(updateCountdownLoop, 1000);
setInterval(updateClockDisplay, 1000);

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshAll(); });
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'n') requestNotificationPermission(); });

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registrado'))
        .catch(err => console.warn('SW falhou', err));
}
