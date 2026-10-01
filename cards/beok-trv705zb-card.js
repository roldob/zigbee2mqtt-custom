// BEOK TRV-705ZB Home Assistant Lovelace cards
// Dependency-free.
// Registers:
//   custom:beok-trv705zb-compact-card
//   custom:beok-trv705zb-status-card
//   custom:beok-trv705zb-full-card
const DAYS = [
  ['monday','Mon'], ['tuesday','Tue'], ['wednesday','Wed'], ['thursday','Thu'],
  ['friday','Fri'], ['saturday','Sat'], ['sunday','Sun'],
];

const SPECS = {
  battery: ['sensor'], window: ['binary_sensor','sensor'], position: ['sensor','number'],
  system_mode: ['select'], switch_hysteresis: ['number'], upper_temperature_limit: ['number'],
  comfort_temperature: ['number'], eco_temperature: ['number'], antifrost_temperature: ['number'],
  local_temperature_calibration: ['number'], window_detection: ['switch','input_boolean'],
  frost_protection: ['switch','input_boolean'], child_lock: ['lock','switch','select'],
  display_brightness: ['select'], screen_orientation: ['select'], vacation_days: ['number'],
  vacation_days_active: ['sensor','number'], boost_duration: ['number'], boost_minutes_active: ['sensor','number'],
  temporary_mode: ['select'], critical_low_battery_action: ['select'],
  enhanced_child_lock: ['switch','input_boolean','select'], thrust_mode: ['select'],
  valve_calibration: ['sensor','select'], reset_all_settings: ['select','button'],
};
for (const [day] of DAYS) SPECS[`schedule_${day}`] = ['text','sensor'];

const NUMBER_DEFAULTS = {
  switch_hysteresis: 0.5,
  upper_temperature_limit: 30,
  comfort_temperature: 20,
  eco_temperature: 15,
  antifrost_temperature: 5,
  local_temperature_calibration: 0,
  vacation_days: 1,
  boost_duration: 30,
};

const DEFAULT_SCHEDULE = [
  {time:'06:00', temperature:20},
  {time:'08:00', temperature:15},
  {time:'12:00', temperature:20},
  {time:'14:00', temperature:15},
  {time:'18:00', temperature:20},
  {time:'22:00', temperature:15},
];

const LABELS = {
  system_mode: 'Regulation mode', switch_hysteresis: 'Switch hysteresis',
  upper_temperature_limit: 'Upper temperature limit', comfort_temperature: 'Comfort temperature',
  eco_temperature: 'Eco temperature', antifrost_temperature: 'Antifrost temperature',
  local_temperature_calibration: 'Temperature calibration', window_detection: 'Window detection',
  frost_protection: 'Frost protection', child_lock: 'Child lock', display_brightness: 'Display brightness',
  screen_orientation: 'Screen orientation', vacation_days: 'Vacation duration',
  vacation_days_active: 'Vacation active days', boost_duration: 'Boost duration',
  boost_minutes_active: 'Boost minutes active', temporary_mode: 'Temporary mode',
  critical_low_battery_action: 'Critical low battery action', enhanced_child_lock: 'Enhanced child lock',
  thrust_mode: 'Thrust mode', valve_calibration: 'Valve calibration', reset_all_settings: 'Reset all settings',
};


const HU_TEXT = {
  'BEOK TRV-705ZB · compact': 'BEOK TRV-705ZB · kompakt',
  'BEOK TRV-705ZB · full control': 'BEOK TRV-705ZB · teljes vezérlés',
  'Room': 'Szoba',
  'Target': 'Cél',
  'Regulation': 'Szabályozás',
  'STATE': 'ÁLLAPOT',
  'Window': 'Ablak',
  'Battery': 'Elem',
  'BOOST': 'GYORSFŰTÉS',
  'Heating': 'Fűtés',
  'Heat': 'Fűtés',
  'Idle': 'Inaktív',
  'OPEN': 'NYITVA',
  'CLOSE': 'ZÁRVA',
  'CLOSED': 'ZÁRVA',
  'ON': 'BE',
  'OFF': 'KI',
  'LOCKED': 'ZÁROLVA',
  'UNLOCKED': 'FELOLDVA',
  'Full open': 'Teljesen nyitva',
  'Antifrost': 'Fagyvédelem',
  'Comfort': 'Komfort',
  'Eco': 'Eco',
  'Program': 'Program',
  'Vacation': 'Szabadság',
  'Boost': 'Gyorsfűtés',
  'Custom': 'Egyedi',
  'Off': 'Ki',
  'Vacation days': 'Szabadság napjai',
  'Boost left': 'Gyorsfűtésből hátra',
  'TRV settings': 'TRV beállítások',
  'Preset temperatures': 'Preset hőmérsékletek',
  'Protection': 'Védelem',
  'Vacation & boost': 'Szabadság és gyorsfűtés',
  'Display': 'Kijelző',
  'Schedule': 'Időprogram',
  'Enhanced functions': 'Kibővített funkciók',
  'Advanced': 'Speciális',
  'Regulation mode': 'Szabályozási mód',
  'Switch hysteresis': 'Kapcsolási hiszterézis',
  'Upper temperature limit': 'Felső hőmérsékletkorlát',
  'Comfort temperature': 'Komfort hőmérséklet',
  'Eco temperature': 'Eco hőmérséklet',
  'Antifrost temperature': 'Fagyvédelmi hőmérséklet',
  'Temperature calibration': 'Hőmérséklet-kalibráció',
  'Window detection': 'Ablakérzékelés',
  'Window state': 'Ablak állapota',
  'Frost protection': 'Fagyvédelem',
  'Child lock': 'Gyerekzár',
  'Display brightness': 'Kijelző fényereje',
  'Screen orientation': 'Kijelző tájolása',
  'Vacation duration': 'Szabadság időtartama',
  'Vacation active days': 'Aktív szabadságnapok',
  'Boost duration': 'Gyorsfűtés időtartama',
  'Boost minutes active': 'Aktív gyorsfűtés percei',
  'Temporary mode': 'Ideiglenes mód',
  'Critical low battery action': 'Kritikus elemmerülés művelete',
  'Enhanced child lock': 'Kibővített gyerekzár',
  'Thrust mode': 'Szelepmotor erőssége',
  'Valve calibration': 'Szelepkalibráció',
  'Reset all settings': 'Minden beállítás visszaállítása',
  'Close valve': 'Szelep bezárása',
  'Open valve to 30%': 'Szelep nyitása 30%-ra',
  'Enabled': 'Engedélyezve',
  'Disabled': 'Letiltva',
  'Auto': 'Automatikus',
  'Normal': 'Normál',
  'Turbo': 'Turbó',
  'Up': 'Fel',
  'Down': 'Le',
  'Running': 'Folyamatban',
  'Completed': 'Kész',
  'High': 'Magas',
  'Medium': 'Közepes',
  'Low': 'Alacsony',
  'Mon': 'H',
  'Tue': 'K',
  'Wed': 'Sze',
  'Thu': 'Cs',
  'Fri': 'P',
  'Sat': 'Szo',
  'Sun': 'V',
  'Decrease': 'Csökkentés',
  'Increase': 'Növelés',
  'Decrease target': 'Célhőmérséklet csökkentése',
  'Increase target': 'Célhőmérséklet növelése',
  'Show history': 'Előzmények megnyitása',
  'History': 'Előzmények',
  'Close': 'Bezárás',
  'History is not available.': 'Az előzmények nem érhetők el.',
  'set default': 'alapérték beállítása',
  'Device has not reported this value. Tap to write the default.': 'Az eszköz még nem jelentette ezt az értéket. Koppints az alapérték kiírásához.',
  'Duration can be preconfigured here. On the status card it appears only while the matching preset is active.': 'Az időtartam itt előre beállítható. A status kártyán csak a megfelelő preset aktív állapotában jelenik meg.',
  'Schedule entities have not been discovered for this device.': 'Az időprogram entitásai nem találhatók ehhez az eszközhöz.',
  'Schedule is not available.': 'Az időprogram nem érhető el.',
  'The TRV has not reported this schedule yet. Showing the Reset All default; Save day/all writes it to the TRV.': 'A TRV még nem jelentette ezt az időprogramot. Az alapértelmezett érték látható; a Nap mentése vagy az Összes mentése írja ki a TRV-re.',
  'Unsaved changes': 'Nem mentett módosítások',
  'Copy to weekdays': 'Másolás hétköznapokra',
  'Copy to all days': 'Másolás minden napra',
  'Reload day': 'Nap újratöltése',
  'Save day': 'Nap mentése',
  'Save all': 'Összes mentése',
  'Reset All Settings entity was not discovered.': 'A Minden beállítás visszaállítása entitás nem található.',
  'This writes the captured vendor defaults for multiple TRV settings.': 'Ez több TRV-beállítást visszaállít a rögzített gyári alapértékekre.',
  'RESET ALL SETTINGS': 'MINDEN BEÁLLÍTÁS VISSZAÁLLÍTÁSA',
  'Reset all BEOK TRV-705ZB settings to vendor defaults?': 'Visszaállítod a BEOK TRV-705ZB összes beállítását a gyári alapértékekre?',
  'Card is not configured.': 'A kártya nincs konfigurálva.',
  'Entity not found': 'Az entitás nem található',
  'Schedule must contain exactly 6 periods.': 'Az időprogramnak pontosan 6 időszakot kell tartalmaznia.',
  'Schedule times must be strictly increasing.': 'Az időprogram időpontjainak szigorúan növekvő sorrendben kell követniük egymást.'
};

let registryCache = {connection: null, time: 0, promise: null};
const esc = (v) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const domain = (id) => String(id ?? '').split('.')[0];
const objectId = (id) => String(id ?? '').split('.').slice(1).join('.');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const prettyPreset = (value) => {
  if (value == null || value === '' || value === 'none') return '';
  const map = {
    full_open: 'Full open',
    antifrost: 'Antifrost',
    comfort: 'Comfort',
    eco: 'Eco',
    program: 'Program',
    vacation: 'Vacation',
    boost: 'Boost',
    custom: 'Custom',
    off: 'Off',
  };
  return map[value] ?? String(value).replaceAll('_',' ');
};

const presetIcon = (value) => ({
  off: 'mdi:power-off',
  full_open: 'mdi:power',
  custom: 'mdi:hand-back-right-outline',
  program: 'mdi:calendar-clock',
  comfort: 'mdi:sofa-outline',
  eco: 'mdi:leaf',
  antifrost: 'mdi:snowflake-off',
  vacation: 'mdi:bag-personal-outline',
  boost: 'mdi:lightning-bolt',
}[value] ?? 'mdi:thermostat');

const prettyState = (value) => {
  const text = String(value ?? '').replaceAll('_',' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
};

const prettyOption = (key, value) => {
  const v = String(value ?? '');
  const labels = {
    critical_low_battery_action: {
      close_valve: 'Close valve',
      open_valve_30: 'Open valve to 30%',
    },
    temporary_mode: {enabled: 'ON', disabled: 'OFF'},
    enhanced_child_lock: {ON: 'ON', OFF: 'OFF'},
    system_mode: {'on-off': 'ON-OFF', pid: 'PID'},
  };
  if (labels[key]?.[v] != null) return labels[key][v];
  return prettyState(v);
};

async function registryForDisplay(hass) {
  const now = Date.now();
  if (registryCache.connection === hass.connection && registryCache.promise && now - registryCache.time < 15000) return registryCache.promise;
  registryCache = {
    connection: hass.connection,
    time: now,
    promise: hass.callWS({type:'config/entity_registry/list_for_display'}).then((r) => r?.entities ?? r ?? []).catch(() => []),
  };
  return registryCache.promise;
}

function candidateTexts(entry, hass) {
  const s = hass.states[entry.ei];
  return [objectId(entry.ei), entry.en, s?.attributes?.friendly_name].filter(Boolean).map(norm);
}

function score(entry, key, hass) {
  if (!SPECS[key]?.includes(domain(entry.ei))) return -1;
  const k = norm(key);
  let n = -1;
  for (const text of candidateTexts(entry, hass)) {
    if (text === k) n = Math.max(n, 220);
    if (text.endsWith(`_${k}`)) n = Math.max(n, 210);
    if (text.startsWith(`${k}_`)) n = Math.max(n, 130);
  }
  return n;
}

function fallbackEntries(hass, climateId) {
  const base = norm(objectId(climateId));
  return Object.keys(hass.states)
    .filter((id) => id !== climateId && norm(objectId(id)).includes(base))
    .map((ei) => ({ei, di:null, en:hass.states[ei]?.attributes?.friendly_name}));
}

function displayState(s) {
  if (!s || ['unknown','unavailable'].includes(s.state)) return '—';
  const u = s.attributes?.unit_of_measurement;
  return u ? `${s.state} ${u}` : s.state;
}

function fmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(1).replace(/\.0$/,'');
}

function parseSchedule(raw) {
  const src = String(raw ?? '').trim();
  const out = [];
  const re = /(\d{1,2}:\d{2})\s*\/\s*(-?\d+(?:\.\d+)?)\s*(?:°?\s*C)?/gi;
  let m;
  while ((m = re.exec(src))) {
    const [h,min] = m[1].split(':').map(Number);
    const t = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59 || !Number.isFinite(t)) return null;
    out.push({time:`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`, temperature:t});
  }
  return out.length === 6 ? out : null;
}

function validateSchedule(entries) {
  if (!entries || entries.length !== 6) return 'Schedule must contain exactly 6 periods.';
  let prev = -1;
  for (let i=0;i<6;i++) {
    const [h,m] = String(entries[i].time).split(':').map(Number);
    const minute = h * 60 + m;
    if (!Number.isFinite(minute) || h > 23 || m > 59 || minute <= prev) return 'Schedule times must be strictly increasing.';
    prev = minute;
    const t = Number(entries[i].temperature);
    if (!Number.isFinite(t) || t < 5 || t > 35) return `Period ${i+1}: temperature must be 5..35 °C.`;
  }
  return null;
}

const scheduleString = (entries) => entries.map((x) => `${x.time}/${Number.isInteger(Number(x.temperature)) ? Number(x.temperature) : Math.round(Number(x.temperature)*10)/10}`).join(' ');

class BeokBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this._hass = null; this._config = null; this._map = {}; this._discovering = false; this._lastDiscover = 0;
    this._error = null; this._drafts = {}; this._dirty = {}; this._scheduleFallback = {}; this._day = 'monday';
    this._openSections = new Set();
    this._presetMenuOpen = false;
    this._numberDrafts = new Map();
    this._boostLocalStart = null;
    this._boostLocalDuration = null;
    this._clockTimer = null;
    this._historyOverlay = null;
    this._historyElement = null;
    this._historyKeyHandler = null;
  }

  connectedCallback() {
    if (!this._clockTimer) {
      this._clockTimer = window.setInterval(() => {
        if (this.climate()?.attributes?.preset_mode === 'boost') this.updateBoostCountdownDom();
      }, 1000);
    }
  }

  disconnectedCallback() {
    if (this._clockTimer) {
      window.clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
    this.closeHistory();
  }

  setConfig(config) {
    if (!config?.entity) throw new Error('entity: climate.xxx is required');
    if (domain(config.entity) !== 'climate') throw new Error('entity must be a climate entity');
    this._config = {name:null, entities:{}, ...config};
    this._map = {}; this._lastDiscover = 0; this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._historyElement) this._historyElement.hass = hass;
    this.reconcileNumberDrafts();
    if (this._config && !this._discovering && (!Object.keys(this._map).length || Date.now()-this._lastDiscover > 60000)) this.discover();
    this.syncDrafts(false); this.render();
  }

  getCardSize() { return 6; }
  static getStubConfig() { return {entity:'climate.example_trv'}; }

  climate() { return this._hass?.states?.[this._config?.entity]; }
  id(key) { return this._config?.entities?.[key] ?? this._map[key] ?? null; }
  state(key) { const id = this.id(key); return id ? this._hass?.states?.[id] : null; }
  title() { return this._config?.name || this.climate()?.attributes?.friendly_name || this._config?.entity || 'BEOK TRV-705ZB'; }

  language() {
    const raw =
      this._hass?.locale?.language ??
      this._hass?.language ??
      document.documentElement?.lang ??
      navigator.language ??
      'en';
    return String(raw).toLowerCase().split(/[-_]/)[0] === 'hu' ? 'hu' : 'en';
  }

  translateText(value) {
    const text=String(value ?? '');
    if (this.language() !== 'hu' || !text) return text;
    if (HU_TEXT[text] != null) return HU_TEXT[text];

    const dayStar=text.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(\*)$/);
    if (dayStar) return `${HU_TEXT[dayStar[1]]}${dayStar[2]}`;

    if (text.startsWith('Valve ')) return `Szelep ${text.slice(6)}`;
    if (text.startsWith('Climate entity not found: ')) return `A climate entitás nem található: ${text.slice(26)}`;
    if (text.startsWith('Entity discovery failed: ')) return `Az entitások felderítése sikertelen: ${text.slice(25)}`;

    let match=text.match(/^Period (\d+): temperature must be 5\.\.35 °C\.$/);
    if (match) return `${match[1]}. időszak: a hőmérsékletnek 5 és 35 °C között kell lennie.`;

    match=text.match(/^(.+) has no numeric value$/);
    if (match) return `${match[1]} nem tartalmaz numerikus értéket`;

    match=text.match(/^(.+) is read-only or unsupported$/);
    if (match) return `${match[1]} csak olvasható vagy nem támogatott`;

    match=text.match(/^(.+) entity not found$/);
    if (match) return `${match[1]} entitás nem található`;

    if (text === 'Changing it restarts Vacation with the new duration.') {
      return 'Módosításkor a Szabadság mód újraindul az új időtartammal.';
    }
    if (text === 'Changing it restarts Boost with the new duration.') {
      return 'Módosításkor a Gyorsfűtés újraindul az új időtartammal.';
    }

    return text;
  }

  localizeDom() {
    if (this.language() !== 'hu' || !this.shadowRoot) return;

    const walker=document.createTreeWalker(this.shadowRoot,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const raw=node.nodeValue ?? '';
      const core=raw.trim();
      if (!core) continue;
      const translated=this.translateText(core);
      if (translated === core) continue;
      const leading=raw.match(/^\s*/)?.[0] ?? '';
      const trailing=raw.match(/\s*$/)?.[0] ?? '';
      node.nodeValue=`${leading}${translated}${trailing}`;
    }

    this.shadowRoot.querySelectorAll('[title],[aria-label]').forEach((element)=>{
      for (const attr of ['title','aria-label']) {
        if (!element.hasAttribute(attr)) continue;
        const value=element.getAttribute(attr);
        const translated=this.translateText(value);
        if (translated !== value) element.setAttribute(attr,translated);
      }
    });
  }



  reconcileNumberDrafts() {
    if (!this._hass || !this._numberDrafts?.size) return;
    const now = Date.now();
    for (const [entityId, draft] of this._numberDrafts) {
      const actual = Number(this._hass.states?.[entityId]?.state);
      if ((Number.isFinite(actual) && Math.abs(actual - draft.value) < 0.0001) || now - draft.time > 8000) {
        this._numberDrafts.delete(entityId);
      }
    }
  }

  keyForEntity(entityId) {
    for (const key of Object.keys(SPECS)) if (this.id(key) === entityId) return key;
    return null;
  }

  actualNumber(stateObj) {
    if (!stateObj || ['unknown','unavailable',''].includes(String(stateObj.state ?? '').toLowerCase())) return null;
    const n = Number(stateObj.state);
    return Number.isFinite(n) ? n : null;
  }

  numberValue(entityId, stateObj) {
    const draft = this._numberDrafts.get(entityId);
    if (draft && Date.now() - draft.time <= 8000) return draft.value;
    const actual = this.actualNumber(stateObj);
    if (Number.isFinite(actual)) return actual;
    const key = this.keyForEntity(entityId);
    const fallback = NUMBER_DEFAULTS[key];
    return Number.isFinite(fallback) ? fallback : null;
  }

  numberUsesFallback(entityId, stateObj) {
    return this.actualNumber(stateObj) == null && Number.isFinite(NUMBER_DEFAULTS[this.keyForEntity(entityId)]);
  }

  numericPrecision(step) {
    const text = String(step ?? '1');
    const decimal = text.includes('.') ? text.split('.')[1].length : 0;
    return Math.min(4, decimal);
  }

  async stepNumber(entityId, direction, activeKind = null) {
    const s = this._hass?.states?.[entityId];
    if (!s) throw new Error(`Entity not found: ${entityId}`);

    const step = Number(s.attributes?.step ?? 1) || 1;
    const min = Number(s.attributes?.min);
    const max = Number(s.attributes?.max);
    const current = this.numberValue(entityId, s);
    if (!Number.isFinite(current)) throw new Error(`${entityId} has no numeric value`);

    let next = current + direction * step;
    if (Number.isFinite(min)) next = Math.max(min, next);
    if (Number.isFinite(max)) next = Math.min(max, next);
    next = Number(next.toFixed(this.numericPrecision(step)));

    this._numberDrafts.set(entityId, {value: next, time: Date.now()});
    this.render();
    await this.setEntity(entityId, next);

    if (activeKind) {
      await delay(150);
      await this.setPreset(activeKind);
    }
  }

  positionPercent() {
    const s = this.state('position');
    if (!s || ['unknown','unavailable'].includes(s.state)) return null;
    const n = Number(s.state);
    if (!Number.isFinite(n)) return null;
    return `${fmt(n)}%`;
  }

  activeCountdown() {
    const preset = this.climate()?.attributes?.preset_mode;
    if (preset === 'vacation') {
      const s = this.state('vacation_days_active');
      const n = Number(s?.state);
      // DP117 is known to carry the configured/active vacation-day value, but
      // it has not been verified as a continuously decrementing "days left" counter.
      if (Number.isFinite(n) && n > 0) return {label:'Vacation days', value:`${fmt(n)} d`, icon:'mdi:calendar-clock', cls:'countdown'};
    }
    if (preset === 'boost') {
      const s = this.state('boost_minutes_active');
      const n = Number(s?.state);
      if (Number.isFinite(n) && n > 0) {
        let startedAt = this._boostLocalStart;
        let durationMinutes = this._boostLocalDuration;

        if (!startedAt || !Number.isFinite(durationMinutes)) {
          const stamp = Date.parse(s?.last_changed || s?.last_updated || '');
          if (Number.isFinite(stamp)) startedAt = stamp;
          durationMinutes = n;
        }

        const elapsedSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
        const remainingSeconds = Math.max(0, Math.round(durationMinutes * 60) - elapsedSeconds);
        const mm = Math.floor(remainingSeconds / 60);
        const ss = remainingSeconds % 60;
        return {
          label:'Boost left',
          value:`${mm}:${String(ss).padStart(2,'0')}`,
          icon:'mdi:timer-sand',
          cls:'countdown',
        };
      }
    }
    return null;
  }

  boostCountdownText() {
    const countdown = this.activeCountdown();
    return countdown?.label === 'Boost left' ? countdown.value : '—';
  }

  updateBoostCountdownDom() {
    if (!this.shadowRoot || this.climate()?.attributes?.preset_mode !== 'boost') return;
    const text = this.boostCountdownText();
    this.shadowRoot.querySelectorAll('[data-boost-countdown]').forEach((element) => {
      if (element.textContent !== text) element.textContent = text;
    });
  }

  metricHtml(label, value, icon, cls='', historyEntityId=null) {
    const history=historyEntityId
      ? ` data-history-entity="${esc(historyEntityId)}" class="metric ${esc(cls)} history-link" role="button" tabindex="0" aria-label="Show history" title="Show history"`
      : ` class="metric ${esc(cls)}"`;
    return `<div${history}><div class="metric-head"><ha-icon icon="${esc(icon)}"></ha-icon><div class="lab">${esc(label)}</div></div><div class="val">${value === '' ? '&nbsp;' : esc(value)}</div></div>`;
  }

  historyEntity(key, fallback=null) {
    return this.id(key) ?? fallback;
  }

  async openHistory(entityId) {
    if (!entityId || !this._hass) return;

    this.closeHistory();

    const stateObj=this._hass.states?.[entityId];
    const entityName=stateObj?.attributes?.friendly_name ?? entityId;
    const overlay=document.createElement('div');
    overlay.className='beok-trv-history-overlay';
    overlay.innerHTML=`
      <style>
        .beok-trv-history-overlay{
          position:fixed;inset:0;z-index:10000;
          display:flex;align-items:center;justify-content:center;
          padding:24px;box-sizing:border-box;
          background:rgba(0,0,0,.46);
        }
        .beok-trv-history-popup{
          width:min(760px,calc(100vw - 32px));
          max-height:min(86vh,820px);
          max-height:min(86dvh,820px);
          display:flex;flex-direction:column;overflow:hidden;
          border-radius:var(--ha-card-border-radius,12px);
          background:var(--card-background-color,var(--ha-card-background,var(--primary-background-color)));
          color:var(--primary-text-color);
          box-shadow:0 12px 42px rgba(0,0,0,.42);
        }
        .beok-trv-history-header{
          display:flex;align-items:center;gap:12px;
          padding:14px 16px;border-bottom:1px solid var(--divider-color);
          flex:0 0 auto;
        }
        .beok-trv-history-title{min-width:0;flex:1}
        .beok-trv-history-title-main{
          font-size:18px;font-weight:600;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;
        }
        .beok-trv-history-title-sub{
          margin-top:2px;font-size:12px;color:var(--secondary-text-color);
        }
        .beok-trv-history-close{
          width:40px;height:40px;border:0;border-radius:50%;
          background:transparent;color:var(--primary-text-color);
          font-size:28px;line-height:1;cursor:pointer;
        }
        .beok-trv-history-close:hover{background:rgba(var(--rgb-primary-text-color,0,0,0),.08)}
        .beok-trv-history-body{
          padding:8px 16px 18px;overflow:auto;min-height:220px;
        }
        .beok-trv-history-body hui-history-graph-card{display:block}
        .beok-trv-history-unavailable{
          padding:32px 8px;text-align:center;color:var(--secondary-text-color);
        }
        @media(max-width:600px){
          .beok-trv-history-overlay{padding:8px}
          .beok-trv-history-popup{
            width:calc(100vw - 16px);
            max-height:calc(100dvh - 16px);
          }
          .beok-trv-history-body{padding:6px 10px 14px}
        }
      </style>
      <div class="beok-trv-history-popup" role="dialog" aria-modal="true" aria-label="${esc(this.translateText('History'))}">
        <div class="beok-trv-history-header">
          <div class="beok-trv-history-title">
            <div class="beok-trv-history-title-main">${esc(entityName)}</div>
            <div class="beok-trv-history-title-sub">${esc(this.translateText('History'))}</div>
          </div>
          <button class="beok-trv-history-close" type="button" aria-label="${esc(this.translateText('Close'))}" title="${esc(this.translateText('Close'))}">×</button>
        </div>
        <div class="beok-trv-history-body"></div>
      </div>
    `;

    const close=()=>this.closeHistory();
    overlay.querySelector('.beok-trv-history-close')?.addEventListener('click',close);
    overlay.addEventListener('click',(event)=>{
      if (event.target === overlay) close();
    });

    const body=overlay.querySelector('.beok-trv-history-body');
    if (body) {
      try {
        if (typeof window.loadCardHelpers !== 'function') throw new Error('Home Assistant card helpers are not available');
        const helpers=await window.loadCardHelpers();
        const historyElement=helpers.createCardElement({
          type:'history-graph',
          entities:[entityId],
          hours_to_show:24,
          show_names:false,
        });
        body.replaceChildren(historyElement);
        historyElement.hass=this._hass;
        this._historyElement=historyElement;
      } catch (error) {
        body.innerHTML=`<div class="beok-trv-history-unavailable">${esc(this.translateText('History is not available.'))}</div>`;
        console.warn('BEOK TRV history popup:',error);
      }
    }

    this._historyKeyHandler=(event)=>{
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown',this._historyKeyHandler);
    document.body.appendChild(overlay);
    this._historyOverlay=overlay;
    overlay.querySelector('.beok-trv-history-close')?.focus();
  }

  closeHistory() {
    if (this._historyKeyHandler) {
      document.removeEventListener('keydown',this._historyKeyHandler);
      this._historyKeyHandler=null;
    }
    if (this._historyOverlay) {
      this._historyOverlay.remove();
      this._historyOverlay=null;
    }
    this._historyElement=null;
  }

  bindHistoryTiles() {
    const r=this.shadowRoot;
    if (!r) return;
    const open=(element)=>this.openHistory(element?.dataset?.historyEntity);
    r.querySelectorAll('[data-history-entity]').forEach((element)=>{
      element.addEventListener('click',()=>open(element));
      element.addEventListener('keydown',(event)=>{
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open(event.currentTarget);
      });
    });
  }

  heatingMetricClass(rawState) {
    const state=String(rawState ?? '').trim().toLowerCase();
    return ['heating','heat','on'].includes(state) ? 'heating-glow' : '';
  }

  batteryMetricClass(batteryState) {
    const level=Number(batteryState?.state);
    if (!Number.isFinite(level)) return '';
    if (level < 20) return 'battery-critical';
    if (level < 30) return 'battery-low';
    if (level < 50) return 'battery-warning';
    return '';
  }

  headerHtml(subtitle) {
    return `<div class="header"><div class="header-icon"><ha-icon icon="mdi:radiator"></ha-icon></div><div class="header-text"><div class="title">${esc(this.title())}</div><div class="sub">${esc(subtitle)}</div></div></div>`;
  }

  async discover() {
    if (!this._hass || !this._config || this._discovering) return;
    this._discovering = true;
    try {
      const all = await registryForDisplay(this._hass);
      const ce = all.find((e) => e.ei === this._config.entity);
      const pool = ce?.di ? all.filter((e) => e.di === ce.di && e.ei !== this._config.entity) : fallbackEntries(this._hass, this._config.entity);
      const map = {};
      for (const key of Object.keys(SPECS)) {
        if (this._config.entities?.[key]) { map[key] = this._config.entities[key]; continue; }
        let best = null, bestScore = -1;
        for (const e of pool) { const s = score(e,key,this._hass); if (s > bestScore) { best=e; bestScore=s; } }
        if (best && bestScore >= 130) map[key] = best.ei;
      }
      this._map = map; this._lastDiscover = Date.now(); this.syncDrafts(true);
    } catch (e) { this._error = `Entity discovery failed: ${e?.message ?? e}`; }
    finally { this._discovering = false; this.render(); }
  }

  async setEntity(entityId, value) {
    if (!entityId) throw new Error('Entity not found');
    const d = domain(entityId);
    if (d === 'number') return this._hass.callService('number','set_value',{entity_id:entityId,value:Number(value)});
    if (d === 'select') return this._hass.callService('select','select_option',{entity_id:entityId,option:value});
    if (d === 'switch' || d === 'input_boolean') {
      const on = value === true || ['ON','LOCK','on'].includes(String(value));
      return this._hass.callService(d,on?'turn_on':'turn_off',{entity_id:entityId});
    }
    if (d === 'lock') {
      const lock = value === true || ['LOCK','locked'].includes(String(value));
      return this._hass.callService('lock',lock?'lock':'unlock',{entity_id:entityId});
    }
    if (d === 'text') return this._hass.callService('text','set_value',{entity_id:entityId,value:String(value)});
    if (d === 'button') return this._hass.callService('button','press',{entity_id:entityId});
    throw new Error(`${entityId} is read-only or unsupported`);
  }

  async setPreset(preset) {
    if (!preset || preset === 'custom') return;

    // A manually changed target can leave the TRV's underlying DP2 mode unchanged
    // (for example still COMFORT) while the exposed preset is derived as CUSTOM.
    // Re-sending the same DP2 mode alone may therefore not restore DP4/setpoint.
    // Restore the fixed preset's configured temperature first, then select the mode.
    const fixedPresetTemperatureKey = {
      comfort: 'comfort_temperature',
      eco: 'eco_temperature',
      antifrost: 'antifrost_temperature',
    }[preset];

    if (fixedPresetTemperatureKey) {
      const presetEntityId = this.id(fixedPresetTemperatureKey);
      const presetTemperature = presetEntityId
        ? this.numberValue(presetEntityId, this.state(fixedPresetTemperatureKey))
        : NUMBER_DEFAULTS[fixedPresetTemperatureKey];
      if (Number.isFinite(presetTemperature)) {
        await this._hass.callService('climate','set_temperature',{
          entity_id:this._config.entity,
          temperature:presetTemperature,
        });
        await delay(120);
      }
    }

    await this._hass.callService('climate','set_preset_mode',{
      entity_id:this._config.entity,
      preset_mode:preset,
    });

    if (preset === 'boost') {
      const duration = Number(this.state('boost_duration')?.state ?? this.state('boost_minutes_active')?.state);
      this._boostLocalStart = Date.now();
      this._boostLocalDuration = Number.isFinite(duration) && duration > 0 ? duration : 30;
    } else {
      this._boostLocalStart = null;
      this._boostLocalDuration = null;
    }
  }

  async changeTarget(dir) {
    const c = this.climate(); if (!c) return;
    const cur = Number(c.attributes?.temperature); if (!Number.isFinite(cur)) return;
    const step = Number(c.attributes?.target_temp_step ?? 0.5) || 0.5;
    const min = Number(c.attributes?.min_temp ?? 5), max = Number(c.attributes?.max_temp ?? 35);
    const next = Math.max(min,Math.min(max,Math.round((cur + dir*step)*10)/10));
    await this._hass.callService('climate','set_temperature',{entity_id:this._config.entity,temperature:next});
  }

  async changeActiveDuration(kind,value) {
    const key = kind === 'vacation' ? 'vacation_days' : 'boost_duration';
    await this.setEntity(this.id(key),Number(value));
    await delay(150);
    await this.setPreset(kind);
  }

  windowState() {
    const s = this.state('window'); if (!s) return null;
    const v = String(s.state).toUpperCase();
    if (['UNKNOWN','UNAVAILABLE',''].includes(v)) return null;
    if (['OPEN','ON','TRUE'].includes(v)) return 'OPEN';
    if (['CLOSE','CLOSED','OFF','FALSE'].includes(v)) return 'CLOSED';
    return null;
  }

  syncDrafts(force=false) {
    if (!this._hass) return;
    for (const [day] of DAYS) {
      if (!force && this._dirty[day]) continue;
      const p = parseSchedule(this.state(`schedule_${day}`)?.state);
      if (p) {
        this._drafts[day] = p;
        this._scheduleFallback[day] = false;
      } else if (force || !this._drafts[day]) {
        this._drafts[day] = DEFAULT_SCHEDULE.map((x)=>({...x}));
        this._scheduleFallback[day] = true;
      }
    }
  }

  css() { return `
    :host{display:block;position:relative}ha-card{overflow:visible}.card{padding:16px;overflow:visible}
    .header{display:flex;align-items:center;gap:12px;margin-bottom:14px}.header-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--secondary-background-color);color:var(--primary-color);flex:0 0 auto}.header-icon ha-icon{--mdc-icon-size:25px}.header-text{min-width:0}.title{font-size:20px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sub{font-size:12px;color:var(--secondary-text-color);margin-top:2px}
    .metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}.metric{--metric-color:var(--primary-color);position:relative;background:var(--secondary-background-color);border-radius:12px;padding:10px 10px 10px 12px;min-width:0;overflow:visible;isolation:isolate}.metric>.metric-head,.metric>.val,.metric>.metric-sub{position:relative;z-index:2;min-width:0}.metric .lab,.metric .val,.metric .metric-sub{overflow:hidden;text-overflow:ellipsis}.metric:before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--metric-color)}.metric-head{display:flex;align-items:center;gap:5px;margin-bottom:4px;min-width:0}.metric-head ha-icon{--mdc-icon-size:16px;color:var(--metric-color);flex:0 0 auto}.metric.room{--metric-color:var(--info-color,var(--primary-color))}.metric.target-metric{--metric-color:var(--primary-color)}.metric.preset-metric{--metric-color:var(--accent-color,var(--primary-color))}.metric.state-metric{--metric-color:var(--state-climate-heat-color,var(--warning-color,var(--primary-color)))}.metric.window-metric{--metric-color:var(--success-color,var(--primary-color))}.metric.battery-metric{--metric-color:var(--success-color,var(--primary-color))}.metric.countdown{--metric-color:var(--warning-color,var(--primary-color))}.metric.history-link{cursor:pointer;transition:filter .12s ease,transform .12s ease}.metric.history-link:hover{filter:brightness(1.06)}.metric.history-link:active{transform:scale(.985)}.metric.history-link:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
    .metric.heating-glow,.metric.battery-warning,.metric.battery-low,.metric.battery-critical,.metric.window-open-glow{background:radial-gradient(ellipse at 50% 48%,rgba(var(--glow-rgb),.22) 0%,rgba(var(--glow-rgb),.11) 48%,rgba(var(--glow-rgb),.025) 78%,transparent 100%),color-mix(in srgb,var(--secondary-background-color) 78%,transparent);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);border:1px solid rgba(var(--glow-rgb),.08)}
    .metric.heating-glow:after,.metric.battery-warning:after,.metric.battery-low:after,.metric.battery-critical:after,.metric.window-open-glow:after{content:'';position:absolute;z-index:0;pointer-events:none;inset:-8px;border-radius:inherit;background:radial-gradient(ellipse at 50% 50%,rgba(var(--glow-rgb),.42) 0%,rgba(var(--glow-rgb),.24) 40%,rgba(var(--glow-rgb),.10) 64%,transparent 82%);filter:blur(10px);opacity:.68;transform:scale(.97)}
    .metric.heating-glow{--metric-color:#ef5350;--glow-rgb:239,83,80}.metric.battery-warning{--metric-color:#fbc02d;--glow-rgb:251,192,45}.metric.battery-low{--metric-color:#fb8c00;--glow-rgb:251,140,0}.metric.battery-critical{--metric-color:#e53935;--glow-rgb:229,57,53}.metric.window-open-glow{--metric-color:#e53935;--glow-rgb:229,57,53}
    .metric.battery-critical:after{animation:beok-backlight-pulse 2s ease-in-out infinite}.metric.window-open-glow:after{animation:beok-window-pulse 1.05s ease-in-out infinite}@keyframes beok-backlight-pulse{0%,100%{opacity:.45;transform:scale(.96);filter:blur(9px)}50%{opacity:.92;transform:scale(1.035);filter:blur(13px)}}@keyframes beok-window-pulse{0%,100%{opacity:.40;transform:scale(.955);filter:blur(9px)}50%{opacity:1;transform:scale(1.05);filter:blur(14px)}}@media (prefers-reduced-motion:reduce){.metric.battery-critical:after,.metric.window-open-glow:after{animation:none;opacity:.68;transform:scale(.97);filter:blur(10px)}}.lab{font-size:11px;color:var(--secondary-text-color);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.val{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.state-main{line-height:1.15}.metric-sub{font-size:12px;color:var(--secondary-text-color);font-weight:500;line-height:1.2;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .target{display:grid;grid-template-columns:56px 1fr 56px;gap:10px;align-items:center;margin:12px 0}.target .v{text-align:center;font-size:25px;font-weight:600}
    button,select,input{font:inherit;box-sizing:border-box}button{border:0;border-radius:10px;min-height:44px;padding:8px 12px;background:var(--secondary-background-color);color:var(--primary-text-color);cursor:pointer;touch-action:manipulation}.big{font-size:27px;padding:0}.primary{background:var(--primary-color);color:var(--text-primary-color,white)}.danger{background:var(--error-color);color:white}button:disabled{opacity:.45}
    select,input[type=time],input[type=text]{width:100%;min-height:42px;border:1px solid var(--divider-color);border-radius:8px;padding:6px 8px;background:var(--card-background-color);color:var(--primary-text-color)}
    .preset-wrap{position:relative;margin:4px 0 8px;z-index:1}.preset-wrap.open{z-index:1000}.preset-button{width:100%;min-height:50px;display:flex;align-items:center;justify-content:center;gap:9px;background:var(--card-background-color);border:1px solid var(--divider-color);font-size:18px;font-weight:600}.preset-button ha-icon{--mdc-icon-size:23px;color:var(--primary-color)}.preset-button .chevron{margin-left:4px;color:var(--secondary-text-color);transition:transform .15s}.preset-wrap.open .preset-button .chevron{transform:rotate(180deg)}
    .preset-menu{position:absolute;z-index:1001;left:0;right:0;top:calc(100% + 4px);padding:5px;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.28);display:none;max-height:380px;overflow:auto}.preset-wrap.open .preset-menu{display:block}.preset-option{width:100%;display:flex;align-items:center;justify-content:flex-start;gap:11px;background:transparent;border-radius:8px;text-align:left;font-size:16px;font-weight:500}.preset-option ha-icon{--mdc-icon-size:23px;color:var(--primary-color)}.preset-option.current{background:var(--secondary-background-color);font-weight:650}.preset-option.disabled{opacity:.55;cursor:default}.preset-option-label{flex:1}.preset-current-empty{color:var(--secondary-text-color)}
    .conditional{margin-top:10px;padding:10px;border-radius:12px;background:var(--secondary-background-color)}.field{display:grid;grid-template-columns:minmax(140px,1fr) minmax(180px,1fr);gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--divider-color)}.field:last-child{border-bottom:0}.control{display:flex;justify-content:flex-end;align-items:center;gap:6px;min-width:0}.readonly{color:var(--secondary-text-color);text-align:right}
    .stepper{display:grid;grid-template-columns:46px minmax(78px,1fr) 46px;gap:6px;align-items:center;width:100%;max-width:245px;margin-left:auto}.stepper button{font-size:23px;padding:0;min-height:44px}.step-value{min-height:44px;border-radius:10px;background:var(--secondary-background-color);display:flex;align-items:center;justify-content:center;text-align:center;font-weight:600;padding:4px 7px;white-space:nowrap}.conditional .step-value{background:var(--card-background-color)}button.step-value{width:100%;border:1px dashed var(--warning-color,var(--primary-color));flex-direction:column;line-height:1.05}button.step-value small{font-size:9px;font-weight:500;color:var(--secondary-text-color);margin-top:3px;text-transform:uppercase;letter-spacing:.04em}
    .toggle{display:inline-flex;align-items:center;gap:10px;min-width:112px;justify-content:flex-end;background:transparent;padding:0;min-height:44px}.toggle .toggle-label{font-weight:600;min-width:38px;text-align:right}.toggle-track{position:relative;width:52px;height:30px;border-radius:999px;background:var(--disabled-color,var(--divider-color));transition:background .18s ease;box-shadow:inset 0 0 0 1px var(--divider-color)}.toggle-knob{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:var(--card-background-color);box-shadow:0 1px 4px rgba(0,0,0,.35);transition:transform .18s ease}.toggle.on .toggle-track{background:var(--success-color,var(--primary-color))}.toggle.on .toggle-knob{transform:translateX(22px)}
    details{--section-color:var(--primary-color);border-top:1px solid var(--divider-color)}details.settings-group{margin-top:2px}details.settings-group>.section{padding:0 0 2px 12px}details.settings-group>.section>details:first-child{border-top:0}details[data-section=temperature]{--section-color:var(--primary-color)}details[data-section=regulation]{--section-color:var(--accent-color,var(--primary-color))}details[data-section=protection]{--section-color:var(--success-color,var(--primary-color))}details[data-section=temporary]{--section-color:var(--warning-color,var(--primary-color))}details[data-section=display]{--section-color:var(--info-color,var(--primary-color))}details[data-section=enhanced]{--section-color:var(--purple-color,var(--primary-color))}details[data-section=schedule]{--section-color:var(--primary-color)}details[data-section=advanced]{--section-color:var(--error-color)}
    summary{cursor:pointer;list-style:none;padding:15px 2px;font-weight:600;display:flex;align-items:center;gap:9px;user-select:none}summary::-webkit-details-marker{display:none}summary:before{content:'›';display:inline-block;transition:transform .15s;font-size:20px;color:var(--secondary-text-color)}details[open]>summary:before{transform:rotate(90deg)}summary ha-icon{--mdc-icon-size:21px;color:var(--section-color)}details[open]>summary span{color:var(--section-color)}.section{padding:0 2px 14px}.note,.error,.dirty{font-size:12px}.note{color:var(--secondary-text-color)}.error{color:var(--error-color);margin-top:10px}.dirty{color:var(--warning-color,var(--primary-color))}
    .tabs{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:10px}.tabs button{min-height:38px;padding:6px 2px}.tabs .active{background:var(--primary-color);color:var(--text-primary-color,white)}.sched{display:grid;grid-template-columns:28px minmax(105px,1fr) minmax(180px,1fr);gap:8px;align-items:center;margin:7px 0}.sched .stepper{max-width:none}.period{text-align:center;color:var(--secondary-text-color)}.actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
    .compact-card{padding:10px 12px}.compact-card .header{margin-bottom:8px;gap:8px}.compact-card .header-icon{width:34px;height:34px}.compact-card .header-icon ha-icon{--mdc-icon-size:21px}.compact-card .title{font-size:17px}.compact-card .sub{font-size:12px;margin-top:0}.compact-card .metrics{gap:6px;margin-bottom:7px}.compact-card .metric{padding:7px 8px 7px 10px;border-radius:9px}.compact-card .metric-head{margin-bottom:2px}.compact-card .lab{font-size:9px}.compact-card .metric-head ha-icon{--mdc-icon-size:14px}.compact-card .val{font-size:15px}.compact-card .metric-sub{font-size:10px;margin-top:1px}.compact-preset{display:flex;align-items:center;justify-content:center;gap:7px;min-height:34px;padding:5px 9px;border-radius:9px;background:var(--secondary-background-color);font-size:14px;font-weight:600}.compact-preset ha-icon{--mdc-icon-size:19px;color:var(--primary-color)}
    @media(max-width:600px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.field{grid-template-columns:1fr;gap:6px}.control{justify-content:stretch}.readonly{text-align:left}.stepper{max-width:none;margin-left:0}.tabs{grid-template-columns:repeat(4,1fr)}.sched{grid-template-columns:24px minmax(95px,1fr) minmax(150px,1.25fr)}}
  `; }

  targetText() {
    const a=this.climate()?.attributes ?? {};
    if (a.preset_mode === 'full_open') return 'ON';
    const v=fmt(a.temperature);
    return v === '—' ? '—' : `${v} °C`;
  }

  sectionOpen(name) { return this._openSections.has(name) ? 'open' : ''; }

  metrics() {
    const c=this.climate(), a=c?.attributes ?? {}, w=this.windowState();
    const presetRaw=a.preset_mode;
    const position=this.positionPercent();
    const rawState=a.hvac_action ?? c?.state;
    const stateMain=prettyState(rawState);
    const stateSub=position ? `Valve ${position}` : '';
    const battery=this.state('battery');
    const batteryValue=battery?displayState(battery):'—';
    const stateGlow=this.heatingMetricClass(rawState);
    const batteryGlow=this.batteryMetricClass(battery);
    const modeState=this.state('system_mode');
    const regulation=modeState && !['unknown','unavailable',''].includes(String(modeState.state ?? '').toLowerCase())
      ? prettyOption('system_mode',modeState.state)
      : '—';
    const countdown=this.activeCountdown();
    const isBoost=presetRaw==='boost';

    let html='<div class="metrics">';
    html+=this.metricHtml('Room',`${fmt(a.current_temperature)} °C`,'mdi:home-thermometer-outline','room',this._config.entity);
    if (isBoost) {
      html+=`<div class="metric target-metric countdown"><div class="metric-head"><ha-icon icon="mdi:fire-clock"></ha-icon><div class="lab">BOOST</div></div><div class="val" data-boost-countdown>${esc(this.boostCountdownText())}</div></div>`;
    } else {
      html+=this.metricHtml('Target',this.targetText(),'mdi:target','target-metric');
    }
    html+=this.metricHtml('Regulation',regulation,'mdi:tune-variant','regulation-metric');
    const stateHistory=this.historyEntity('position',this._config.entity);
    html+=`<div class="metric state-metric ${stateGlow} history-link" data-history-entity="${esc(stateHistory)}" role="button" tabindex="0" aria-label="Show history" title="Show history"><div class="metric-head"><ha-icon icon="mdi:radiator"></ha-icon><div class="lab">STATE</div></div><div class="val state-main">${esc(stateMain)}</div>${stateSub?`<div class="metric-sub">${esc(stateSub)}</div>`:''}</div>`;
    html+=this.metricHtml('Window',w ?? '—',w==='OPEN'?'mdi:window-open-variant':'mdi:window-closed-variant',`window-metric ${w==='OPEN'?'window-open-glow':''}`,this.historyEntity('window'));
    html+=this.metricHtml('Battery',batteryValue,'mdi:battery',`battery-metric ${batteryGlow}`);
    if (countdown && !isBoost) html+=this.metricHtml(countdown.label,countdown.value,countdown.icon,countdown.cls);
    html+='</div>';
    return html;
  }

  targetControl() {
    if (this.climate()?.attributes?.preset_mode === 'boost') return '';
    return `<div class="target"><button class="big" data-a="minus" aria-label="Decrease target">−</button><div class="v">${esc(this.targetText())}</div><button class="big" data-a="plus" aria-label="Increase target">+</button></div>`;
  }

  presetControl() {
    const a=this.climate()?.attributes ?? {}, cur=a.preset_mode ?? '', modes=Array.isArray(a.preset_modes)?a.preset_modes:[];
    const visible=modes.filter((p)=>p!=='none');
    const currentValid=cur && cur!=='none';
    const currentLabel=currentValid?prettyPreset(cur):'';
    const currentIcon=currentValid?presetIcon(cur):'mdi:thermostat';
    const options=visible.map((p)=>{
      const disabled=p==='custom' && p!==cur;
      return `<button class="preset-option ${p===cur?'current':''} ${disabled?'disabled':''}" data-a="preset-option" data-preset="${esc(p)}" ${disabled?'disabled':''}><ha-icon icon="${esc(presetIcon(p))}"></ha-icon><span class="preset-option-label">${esc(prettyPreset(p))}</span>${p===cur?'<ha-icon icon="mdi:check"></ha-icon>':''}</button>`;
    }).join('');
    return `<div class="preset-wrap ${this._presetMenuOpen?'open':''}" data-preset-wrap><button class="preset-button" data-a="preset-toggle" aria-expanded="${this._presetMenuOpen?'true':'false'}"><ha-icon icon="${esc(currentIcon)}"></ha-icon><span class="${currentValid?'':'preset-current-empty'}">${currentValid?esc(currentLabel):'—'}</span><ha-icon class="chevron" icon="mdi:chevron-down"></ha-icon></button><div class="preset-menu">${options}</div></div>`;
  }

  displayUnit(unit) {
    const raw=String(unit ?? '');
    if (this.language() !== 'hu') return raw;
    return ({d:'nap', min:'perc'})[raw] ?? raw;
  }

  displayReadonlyState(key,s) {
    if (key === 'window') return this.windowState() ?? '—';
    if (!s || ['unknown','unavailable',''].includes(String(s.state ?? '').toLowerCase())) return '—';
    const unit=this.displayUnit(s.attributes?.unit_of_measurement ?? '');
    return unit ? `${s.state} ${unit}` : s.state;
  }

  numberStepper(entityId,s,action='step-number',activeKind=null) {
    const value=this.numberValue(entityId,s);
    const unit=this.displayUnit(s.attributes?.unit_of_measurement ?? '');
    const text=value==null?'—':`${fmt(value)}${unit?` ${unit}`:''}`;
    const fallback=this.numberUsesFallback(entityId,s);
    const middle=fallback && value!=null
      ? `<button class="step-value" data-a="set-default-number" data-id="${esc(entityId)}" data-value="${esc(value)}" ${activeKind?`data-kind="${esc(activeKind)}"`:''} title="Device has not reported this value. Tap to write the default."><span>${esc(text)}</span><small>set default</small></button>`
      : `<div class="step-value">${esc(text)}</div>`;
    return `<div class="stepper"><button data-a="${esc(action)}" data-id="${esc(entityId)}" data-dir="-1" ${activeKind?`data-kind="${esc(activeKind)}"`:''} aria-label="Decrease">−</button>${middle}<button data-a="${esc(action)}" data-id="${esc(entityId)}" data-dir="1" ${activeKind?`data-kind="${esc(activeKind)}"`:''} aria-label="Increase">+</button></div>`;
  }

  durationControl() {
    const p=this.climate()?.attributes?.preset_mode;
    const key=p==='vacation'?'vacation_days':p==='boost'?'boost_duration':null;
    if (!key) return '';
    const id=this.id(key), s=this.state(key); if (!id || !s) return '';
    return `<div class="conditional"><div class="field"><div>${esc(LABELS[key])}<div class="note">Changing it restarts ${esc(prettyPreset(p))} with the new duration.</div></div><div class="control">${this.numberStepper(id,s,'active-step',p)}</div></div></div>`;
  }

  toggleControl(entityId, isOn, nextValue, onLabel='ON', offLabel='OFF', action='toggle') {
    return `<button class="toggle ${isOn?'on':''}" data-a="${esc(action)}" data-id="${esc(entityId)}" data-value="${esc(nextValue)}" role="switch" aria-checked="${isOn?'true':'false'}"><span class="toggle-label">${esc(isOn?onLabel:offLabel)}</span><span class="toggle-track"><span class="toggle-knob"></span></span></button>`;
  }

  field(key,label=null) {
    const id=this.id(key), s=this.state(key); if (!id || !s) return '';
    const d=domain(id), l=label ?? LABELS[key] ?? key;
    if (d==='number') return `<div class="field"><div>${esc(l)}</div><div class="control">${this.numberStepper(id,s)}</div></div>`;

    if (d==='select') {
      const options=s.attributes?.options ?? [];

      if (key==='temporary_mode' && options.includes('enabled') && options.includes('disabled')) {
        const on=s.state==='enabled';
        return `<div class="field"><div>${esc(l)}</div><div class="control">${this.toggleControl(id,on,on?'disabled':'enabled','ON','OFF','toggle-select')}</div></div>`;
      }

      if (options.includes('ON') && options.includes('OFF')) {
        const on=s.state==='ON';
        return `<div class="field"><div>${esc(l)}</div><div class="control">${this.toggleControl(id,on,on?'OFF':'ON','ON','OFF','toggle-select')}</div></div>`;
      }

      if (options.includes('LOCK') && options.includes('UNLOCK')) {
        const on=s.state==='LOCK';
        return `<div class="field"><div>${esc(l)}</div><div class="control">${this.toggleControl(id,on,on?'UNLOCK':'LOCK','LOCKED','UNLOCKED','toggle-select')}</div></div>`;
      }

      return `<div class="field"><div>${esc(l)}</div><div class="control"><select data-a="select" data-id="${esc(id)}">${options.map((o)=>`<option value="${esc(o)}" ${o===s.state?'selected':''}>${esc(prettyOption(key,o))}</option>`).join('')}</select></div></div>`;
    }

    if (d==='switch'||d==='input_boolean') {
      const on=s.state==='on';
      return `<div class="field"><div>${esc(l)}</div><div class="control">${this.toggleControl(id,on,on?'OFF':'ON')}</div></div>`;
    }

    if (d==='lock') {
      const on=s.state==='locked';
      return `<div class="field"><div>${esc(l)}</div><div class="control">${this.toggleControl(id,on,on?'UNLOCK':'LOCK','LOCKED','UNLOCKED','lock')}</div></div>`;
    }

    return `<div class="field"><div>${esc(l)}</div><div class="control readonly">${esc(this.displayReadonlyState(key,s))}</div></div>`;
  }

  bindCommon() {
    const r=this.shadowRoot;
    r.querySelector('[data-a=minus]')?.addEventListener('click',()=>this.changeTarget(-1).catch((e)=>this.fail(e)));
    r.querySelector('[data-a=plus]')?.addEventListener('click',()=>this.changeTarget(1).catch((e)=>this.fail(e)));
    r.querySelector('[data-a=preset-toggle]')?.addEventListener('click',()=>{this._presetMenuOpen=!this._presetMenuOpen;this.render();});
    r.querySelectorAll('[data-a=preset-option]').forEach((el)=>el.addEventListener('click',(e)=>{const preset=e.currentTarget.dataset.preset;if(!preset||preset==='custom')return;this._presetMenuOpen=false;this.render();this.setPreset(preset).catch((x)=>this.fail(x));}));
    r.querySelectorAll('[data-a=step-number]').forEach((el)=>el.addEventListener('click',(e)=>this.stepNumber(e.currentTarget.dataset.id,Number(e.currentTarget.dataset.dir)).catch((x)=>this.fail(x))));
    r.querySelectorAll('[data-a=active-step]').forEach((el)=>el.addEventListener('click',(e)=>this.stepNumber(e.currentTarget.dataset.id,Number(e.currentTarget.dataset.dir),e.currentTarget.dataset.kind).catch((x)=>this.fail(x))));
    r.querySelectorAll('[data-a=set-default-number]').forEach((el)=>el.addEventListener('click',async(e)=>{const b=e.currentTarget;try{const value=Number(b.dataset.value);this._numberDrafts.set(b.dataset.id,{value,time:Date.now()});this.render();await this.setEntity(b.dataset.id,value);if(b.dataset.kind){await delay(150);await this.setPreset(b.dataset.kind);}}catch(x){this.fail(x);}}));
    r.querySelectorAll('[data-a=select]').forEach((el)=>el.addEventListener('change',(e)=>this.setEntity(e.target.dataset.id,e.target.value).catch((x)=>this.fail(x))));
    r.querySelectorAll('[data-a=toggle],[data-a=toggle-select],[data-a=lock]').forEach((el)=>el.addEventListener('click',(e)=>this.setEntity(e.currentTarget.dataset.id,e.currentTarget.dataset.value).catch((x)=>this.fail(x))));
  }

  fail(e) { this._error=e?.message ?? String(e); this.render(); }
  early() {
    if (!this._config) return '<ha-card><div class="card">Card is not configured.</div></ha-card>';
    if (!this.climate()) return `<ha-card><div class="card"><div class="error">Climate entity not found: ${esc(this._config.entity)}</div></div></ha-card>`;
    return null;
  }
}

class BeokCompact extends BeokBase {
  compactMetrics() {
    const c=this.climate(), a=c?.attributes ?? {}, w=this.windowState();
    const position=this.positionPercent();
    const rawState=a.hvac_action ?? c?.state;
    const stateMain=prettyState(rawState);
    const stateSub=position ? `Valve ${position}` : '';
    const battery=this.state('battery');
    const batteryValue=battery?displayState(battery):'—';
    const stateGlow=this.heatingMetricClass(rawState);
    const batteryGlow=this.batteryMetricClass(battery);
    const modeState=this.state('system_mode');
    const regulation=modeState && !['unknown','unavailable',''].includes(String(modeState.state ?? '').toLowerCase())
      ? prettyOption('system_mode',modeState.state)
      : '—';
    const isBoost=a.preset_mode==='boost';

    let html='<div class="metrics">';
    html+=this.metricHtml('Room',`${fmt(a.current_temperature)} °C`,'mdi:home-thermometer-outline','room',this._config.entity);
    if (isBoost) {
      html+=`<div class="metric target-metric countdown"><div class="metric-head"><ha-icon icon="mdi:fire-clock"></ha-icon><div class="lab">BOOST</div></div><div class="val" data-boost-countdown>${esc(this.boostCountdownText())}</div></div>`;
    } else {
      html+=this.metricHtml('Target',this.targetText(),'mdi:target','target-metric');
    }
    html+=this.metricHtml('Regulation',regulation,'mdi:tune-variant','regulation-metric');
    const stateHistory=this.historyEntity('position',this._config.entity);
    html+=`<div class="metric state-metric ${stateGlow} history-link" data-history-entity="${esc(stateHistory)}" role="button" tabindex="0" aria-label="Show history" title="Show history"><div class="metric-head"><ha-icon icon="mdi:radiator"></ha-icon><div class="lab">STATE</div></div><div class="val state-main">${esc(stateMain)}</div>${stateSub?`<div class="metric-sub">${esc(stateSub)}</div>`:''}</div>`;
    html+=this.metricHtml('Window',w ?? '—',w==='OPEN'?'mdi:window-open-variant':'mdi:window-closed-variant',`window-metric ${w==='OPEN'?'window-open-glow':''}`,this.historyEntity('window'));
    html+=this.metricHtml('Battery',batteryValue,'mdi:battery',`battery-metric ${batteryGlow}`);
    html+='</div>';
    return html;
  }

  compactPreset() {
    const preset=this.climate()?.attributes?.preset_mode;
    if (!preset || preset==='none') return '<div class="compact-preset"><ha-icon icon="mdi:thermostat"></ha-icon><span>—</span></div>';
    return `<div class="compact-preset"><ha-icon icon="${esc(presetIcon(preset))}"></ha-icon><span>${esc(prettyPreset(preset))}</span></div>`;
  }

  render() {
    if (!this.shadowRoot) return;
    const early=this.early(); if (early) { this.shadowRoot.innerHTML=`<style>${this.css()}</style>${early}`; this.localizeDom(); return; }
    this.shadowRoot.innerHTML=`<style>${this.css()}</style><ha-card><div class="card compact-card">${this.headerHtml('BEOK TRV-705ZB · compact')}${this.compactMetrics()}${this.compactPreset()}${this._error?`<div class="error">${esc(this._error)}</div>`:''}</div></ha-card>`;
    this.localizeDom();
    this.bindHistoryTiles();
  }
}

class BeokStatus extends BeokBase {
  render() {
    if (!this.shadowRoot) return;
    const early=this.early(); if (early) { this.shadowRoot.innerHTML=`<style>${this.css()}</style>${early}`; this.localizeDom(); return; }
    this.shadowRoot.innerHTML=`<style>${this.css()}</style><ha-card><div class="card">${this.headerHtml('BEOK TRV-705ZB')}${this.metrics()}${this.targetControl()}${this.presetControl()}${this.durationControl()}${this._error?`<div class="error">${esc(this._error)}</div>`:''}</div></ha-card>`;
    this.localizeDom();
    this.bindHistoryTiles();
    this.bindCommon();
  }
}

class BeokFull extends BeokBase {
  render() {
    if (!this.shadowRoot) return;
    const early=this.early(); if (early) { this.shadowRoot.innerHTML=`<style>${this.css()}</style>${early}`; this.localizeDom(); return; }
    const enhanced=['temporary_mode','critical_low_battery_action','enhanced_child_lock','thrust_mode','valve_calibration'].some((k)=>this.id(k));
    this.shadowRoot.innerHTML=`<style>${this.css()}</style><ha-card><div class="card">
      ${this.headerHtml('BEOK TRV-705ZB · full control')}
      ${this.metrics()}${this.targetControl()}${this.presetControl()}${this.durationControl()}
      <details class="settings-group" data-section="settings" ${this.sectionOpen('settings')}><summary><ha-icon icon="mdi:cog-outline"></ha-icon><span>TRV settings</span></summary><div class="section">
        <details data-section="temperature" ${this.sectionOpen('temperature')}><summary><ha-icon icon="mdi:thermometer-lines"></ha-icon><span>Preset temperatures</span></summary><div class="section">${this.field('comfort_temperature')}${this.field('eco_temperature')}${this.field('antifrost_temperature')}</div></details>
        <details data-section="regulation" ${this.sectionOpen('regulation')}><summary><ha-icon icon="mdi:tune-variant"></ha-icon><span>Regulation</span></summary><div class="section">${this.field('system_mode')}${this.field('upper_temperature_limit')}${this.field('switch_hysteresis')}${this.field('local_temperature_calibration')}</div></details>
        <details data-section="protection" ${this.sectionOpen('protection')}><summary><ha-icon icon="mdi:shield-home-outline"></ha-icon><span>Protection</span></summary><div class="section">${this.field('window_detection')}${this.field('window','Window state')}${this.field('frost_protection')}${this.field('child_lock')}</div></details>
        <details data-section="temporary" ${this.sectionOpen('temporary')}><summary><ha-icon icon="mdi:timer-outline"></ha-icon><span>Vacation & boost</span></summary><div class="section"><div class="note">Duration can be preconfigured here. On the status card it appears only while the matching preset is active.</div>${this.field('vacation_days')}${this.field('vacation_days_active')}${this.field('boost_duration')}${this.field('boost_minutes_active')}</div></details>
        <details data-section="display" ${this.sectionOpen('display')}><summary><ha-icon icon="mdi:monitor"></ha-icon><span>Display</span></summary><div class="section">${this.field('display_brightness')}${this.field('screen_orientation')}</div></details>
        <details data-section="schedule" ${this.sectionOpen('schedule')}><summary><ha-icon icon="mdi:calendar-clock"></ha-icon><span>Schedule</span></summary><div class="section">${this.scheduleHtml()}</div></details>
        ${enhanced?`<details data-section="enhanced" ${this.sectionOpen('enhanced')}><summary><ha-icon icon="mdi:creation"></ha-icon><span>Enhanced functions</span></summary><div class="section">${this.field('temporary_mode')}${this.field('critical_low_battery_action')}${this.field('enhanced_child_lock')}${this.field('thrust_mode')}${this.field('valve_calibration')}</div></details>`:''}
        <details data-section="advanced" ${this.sectionOpen('advanced')}><summary><ha-icon icon="mdi:alert-octagon-outline"></ha-icon><span>Advanced</span></summary><div class="section">${this.advancedHtml()}</div></details>
      </div></details>
      ${this._error?`<div class="error">${esc(this._error)}</div>`:''}
    </div></ha-card>`;
    this.localizeDom();
    this.bindHistoryTiles();
    this.bindCommon(); this.bindFull();
  }

  scheduleHtml() {
    const available=DAYS.filter(([d])=>this.id(`schedule_${d}`));
    if (!available.length) return '<div class="note">Schedule entities have not been discovered for this device.</div>';
    if (!this.id(`schedule_${this._day}`)) this._day=available[0][0];
    const tabs=available.map(([d,l])=>`<button data-a="day" data-day="${d}" class="${d===this._day?'active':''}">${l}${this._dirty[d]?'*':''}</button>`).join('');
    const rows=this._drafts[this._day];
    if (!rows) return `<div class="tabs">${tabs}</div><div class="note">Schedule is not available.</div>`;
    const body=rows.map((x,i)=>`<div class="sched"><div class="period">${i+1}</div><input type="time" data-a="stime" data-i="${i}" value="${esc(x.time)}"><div class="stepper"><button data-a="stemp-step" data-i="${i}" data-dir="-1">−</button><div class="step-value">${esc(fmt(x.temperature))} °C</div><button data-a="stemp-step" data-i="${i}" data-dir="1">+</button></div></div>`).join('');
    const any=Object.values(this._dirty).some(Boolean);
    const fallbackNote=this._scheduleFallback[this._day]?'<div class="note">The TRV has not reported this schedule yet. Showing the Reset All default; Save day/all writes it to the TRV.</div>':'';
    return `<div class="tabs">${tabs}</div>${fallbackNote}<div class="dirty" data-schedule-dirty ${this._dirty[this._day]?'':'hidden'}>Unsaved changes</div>${body}<div class="actions"><button data-a="copyweek">Copy to weekdays</button><button data-a="copyall">Copy to all days</button><button data-a="reload">Reload day</button><button class="primary" data-a="saveday">Save day</button><button class="primary" data-a="saveall" ${any?'':'disabled'}>Save all</button></div>`;
  }

  advancedHtml() {
    if (!this.id('reset_all_settings')) return '<div class="note">Reset All Settings entity was not discovered.</div>';
    return '<div class="note">This writes the captured vendor defaults for multiple TRV settings.</div><div class="actions"><button class="danger" data-a="reset">RESET ALL SETTINGS</button></div>';
  }

  async saveDay(day) {
    const rows=this._drafts[day], err=validateSchedule(rows); if (err) throw new Error(err);
    const id=this.id(`schedule_${day}`); if (!id) throw new Error(`schedule_${day} entity not found`);
    await this.setEntity(id,scheduleString(rows)); this._dirty[day]=false; this._scheduleFallback[day]=false; this.render();
  }

  async saveAll() {
    for (const [day] of DAYS) if (this._dirty[day] && this.id(`schedule_${day}`)) { await this.saveDay(day); await delay(50); }
    this.render();
  }

  bindFull() {
    const r=this.shadowRoot;
    r.querySelectorAll('details[data-section]').forEach((detail)=>detail.addEventListener('toggle',(e)=>{
      const name=e.currentTarget.dataset.section;
      if (e.currentTarget.open) this._openSections.add(name);
      else this._openSections.delete(name);
    }));
    r.querySelectorAll('[data-a=day]').forEach((b)=>b.addEventListener('click',(e)=>{this._day=e.currentTarget.dataset.day;this.render();}));
    r.querySelectorAll('[data-a=stime]').forEach((x)=>{
      const updateTime=(e)=>{
        const i=Number(e.target.dataset.i);
        this._drafts[this._day][i].time=e.target.value;
        this._dirty[this._day]=true;
        const rawLabel=DAYS.find(([d])=>d===this._day)?.[1] ?? this._day;
        const label=this.translateText(rawLabel);
        const tab=r.querySelector(`[data-a=day][data-day=\"${this._day}\"]`);
        if (tab) tab.textContent=`${label}*`;
        const dirty=r.querySelector('[data-schedule-dirty]');
        if (dirty) dirty.hidden=false;
        const saveAll=r.querySelector('[data-a=saveall]');
        if (saveAll) saveAll.disabled=false;
      };
      x.addEventListener('input',updateTime);
      x.addEventListener('change',updateTime);
    });
    r.querySelectorAll('[data-a=stemp-step]').forEach((x)=>x.addEventListener('click',(e)=>{const i=Number(e.currentTarget.dataset.i),dir=Number(e.currentTarget.dataset.dir);const cur=Number(this._drafts[this._day][i].temperature);this._drafts[this._day][i].temperature=Math.max(5,Math.min(35,Math.round((cur+dir*0.5)*2)/2));this._dirty[this._day]=true;this.render();}));
    r.querySelector('[data-a=copyweek]')?.addEventListener('click',()=>{const src=this._drafts[this._day];for(const d of ['monday','tuesday','wednesday','thursday','friday'])if(this.id(`schedule_${d}`)){this._drafts[d]=src.map((x)=>({...x}));this._dirty[d]=true;}this.render();});
    r.querySelector('[data-a=copyall]')?.addEventListener('click',()=>{const src=this._drafts[this._day];for(const [d] of DAYS)if(this.id(`schedule_${d}`)){this._drafts[d]=src.map((x)=>({...x}));this._dirty[d]=true;}this.render();});
    r.querySelector('[data-a=reload]')?.addEventListener('click',()=>{this._dirty[this._day]=false;const p=parseSchedule(this.state(`schedule_${this._day}`)?.state);if(p){this._drafts[this._day]=p;this._scheduleFallback[this._day]=false;}else{this._drafts[this._day]=DEFAULT_SCHEDULE.map((x)=>({...x}));this._scheduleFallback[this._day]=true;}this.render();});
    r.querySelector('[data-a=saveday]')?.addEventListener('click',()=>this.saveDay(this._day).catch((e)=>this.fail(e)));
    r.querySelector('[data-a=saveall]')?.addEventListener('click',()=>this.saveAll().catch((e)=>this.fail(e)));
    r.querySelector('[data-a=reset]')?.addEventListener('click',async()=>{if(!window.confirm(this.translateText('Reset all BEOK TRV-705ZB settings to vendor defaults?')))return;try{const id=this.id('reset_all_settings');await this.setEntity(id,domain(id)==='button'?true:'RESET');}catch(e){this.fail(e);}});
  }
}

if (!customElements.get('beok-trv705zb-compact-card')) customElements.define('beok-trv705zb-compact-card',BeokCompact);
if (!customElements.get('beok-trv705zb-status-card')) customElements.define('beok-trv705zb-status-card',BeokStatus);
if (!customElements.get('beok-trv705zb-full-card')) customElements.define('beok-trv705zb-full-card',BeokFull);
window.customCards=window.customCards||[];
if(!window.customCards.some((x)=>x.type==='beok-trv705zb-compact-card')) window.customCards.push({type:'beok-trv705zb-compact-card',name:'BEOK TRV-705ZB Compact Card',description:'Minimal read-only BEOK TRV status card',preview:true,getEntitySuggestion:(_h,id)=>domain(id)==='climate'?{config:{type:'custom:beok-trv705zb-compact-card',entity:id}}:null});
if(!window.customCards.some((x)=>x.type==='beok-trv705zb-status-card')) window.customCards.push({type:'beok-trv705zb-status-card',name:'BEOK TRV-705ZB Status Card',description:'Compact BEOK TRV daily-control card',preview:true,getEntitySuggestion:(_h,id)=>domain(id)==='climate'?{config:{type:'custom:beok-trv705zb-status-card',entity:id}}:null});
if(!window.customCards.some((x)=>x.type==='beok-trv705zb-full-card')) window.customCards.push({type:'beok-trv705zb-full-card',name:'BEOK TRV-705ZB Full Card',description:'Full BEOK TRV control and schedule editor',preview:false,getEntitySuggestion:(_h,id)=>domain(id)==='climate'?{config:{type:'custom:beok-trv705zb-full-card',entity:id}}:null});
console.info('BEOK TRV-705ZB cards loaded');
