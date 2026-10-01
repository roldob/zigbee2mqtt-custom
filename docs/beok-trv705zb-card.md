# BEOK TRV-705ZB Home Assistant cards

Dependency-free Lovelace custom cards for the BEOK TRV-705ZB Zigbee2MQTT converter.

The implementation is in [`homeassistant/www/beok-trv705zb-card.js`](../homeassistant/www/beok-trv705zb-card.js) and registers three card types:

- `custom:beok-trv705zb-compact-card`
- `custom:beok-trv705zb-status-card`
- `custom:beok-trv705zb-full-card`

## Compact card

Minimal read-only status card for dense dashboards.

```yaml
type: custom:beok-trv705zb-compact-card
entity: climate.example_trv
```

It omits target adjustment and preset selection. The top metrics include the read-only regulation mode (`ON-OFF` or `PID`), while the current preset is shown below with its icon. Layout spacing, header size and status tiles are reduced compared with the status card.

## Status card

Compact daily-control card, suitable for wall tablets and restricted dashboards.

```yaml
type: custom:beok-trv705zb-status-card
entity: climate.example_trv
```

It shows current room temperature, target/Boost countdown, read-only regulation mode (`ON-OFF` or `PID`), heating state, valve position, window state and battery. The current preset is shown by the icon-based preset selector below the metrics, which remains touch-friendly and editable.

Vacation duration is shown only while Vacation is active. During Boost, the normal target is replaced by a local countdown display and target controls are hidden. When the active preset is `full_open` or `off`, the Target value is shown as `—` because those presets do not have a meaningful target temperature.

### Status backlight indicators

All three card variants use a translucent, diffused backlight effect on status tiles:

- active heating: static red backlight
- battery below 50%: static yellow backlight
- battery below 30%: static orange backlight
- battery below 20%: pulsing red backlight
- open window: faster pulsing red backlight

The compact, status and full cards use the same top metric order: Room, Target/Boost, Regulation, State, Window, Battery. The compact card keeps its preset display read-only; the status and full cards keep the preset selector editable.

## Full card

```yaml
type: custom:beok-trv705zb-full-card
entity: climate.example_trv
```

The full card keeps the daily controls visible and places all configuration controls inside one top-level **TRV settings** section. This section is closed by default. Inside it, the existing collapsible subsections remain available for:

- preset temperatures
- regulation mode, upper limit, hysteresis and temperature calibration
- window detection, frost protection and child lock
- Vacation and Boost settings
- display settings
- seven-day schedule editor
- enhanced-variant controls when those Home Assistant entities exist
- Reset All Settings


## History shortcuts

The Room, State and Window metric tiles are interactive on all three card types and open a dedicated **read-only History popup** without leaving the dashboard:

- **Room** shows Home Assistant's native history graph for the TRV climate entity. The popup contains no climate controls, so target temperature cannot be changed from the compact card.
- **State** shows the valve-position entity's native history graph when that entity is available; otherwise it falls back to the climate entity.
- **Window** shows the discovered window entity's native history graph. If no window entity is available, the tile remains non-interactive.

The popup fetches history directly through Home Assistant's `history/history_during_period` WebSocket API and renders a read-only SVG graph locally. The user can switch the open popup between 1 h, 6 h, 12 h, 24 h, 3 d and 7 d without leaving the dashboard. Pointer hover and touch-drag add a crosshair and tooltip: numeric graphs show the sampled value and timestamp, while discrete Window/heating graphs show the state, segment start/end time and duration. Room history uses the climate entity's `current_temperature` attribute, State uses valve position when available (otherwise heating/idle state), and Window uses an open/closed step graph. This avoids Home Assistant's more-info and Lovelace history-card navigation/lifecycle entirely. The popup can be dismissed with its close button, by clicking the backdrop or by pressing Escape.

## Entity discovery

Normally only the climate entity is required. The card reads the Home Assistant entity registry, finds the selected climate entity's `device_id`, and automatically discovers related entities belonging to the same device.

Individual entities can be overridden when needed:

```yaml
type: custom:beok-trv705zb-full-card
entity: climate.example_trv
entities:
  comfort_temperature: number.example_comfort_temperature
  schedule_monday: text.example_schedule_monday
```

No installation-specific entity IDs are hard-coded in the distributed JavaScript.

## Schedule editor

The full card edits the converter's seven schedule entities. Each day contains six time/temperature transitions.

Available actions:

- Copy to weekdays
- Copy to all days
- Reload day
- Save day
- Save all

If a TRV has not reported a schedule yet, the editor displays the converter's Reset All default as an unsaved fallback. It is not written to the TRV until Save is used.

The time picker updates the schedule draft without rebuilding the editor DOM, so hour and minute can be changed repeatedly while the native time picker remains open.

## Missing numeric reports

Some TRVs do not report every configurable value immediately after pairing or restart. For selected writable settings the card can display the converter's known Reset All default as a fallback.

The fallback is not silently written to the device. The user must press the displayed default value or use the +/- control before a write occurs.

This applies to values such as antifrost temperature, comfort/eco temperatures, upper temperature limit, hysteresis, temperature calibration, Vacation duration and Boost duration.

## Installation

Copy:

```text
homeassistant/www/beok-trv705zb-card.js
```

to Home Assistant, for example:

```text
/config/www/beok-trv705zb-card.js
```

Add a dashboard resource:

```text
/local/beok-trv705zb-card.js
```

with resource type **JavaScript Module**.

Keep the resource URL unchanged when updating the card:

```text
/local/beok-trv705zb-card.js
```

After replacing the JavaScript file, hard-refresh or reload the Home Assistant frontend if an older cached copy is still shown.

## Dashboard visibility

The three card types are intentionally separate. Home Assistant's normal card/dashboard visibility rules can be used so a wall-tablet user sees only the status card while an administrative user sees the full settings card.


## Language

English is the default/fallback UI language. The cards automatically read the Home Assistant frontend language. When the Home Assistant UI language is Hungarian (`hu` or a Hungarian locale such as `hu-HU`), card-owned labels, status text, preset names, buttons, notes, schedule-editor text, tooltips and confirmation prompts are shown in Hungarian.

Entity IDs, Home Assistant service calls, Zigbee2MQTT state values and write payloads are not translated; localization affects display text only. Hungarian display formatting also normalizes the read-only window state to `NYITVA / ZÁRVA`, translates brightness levels to `Magas / Közepes / Alacsony`, and renders day/minute units as `nap` and `perc`. Other UI languages currently fall back to English.

## Privacy

The distributed card contains no hard-coded device IEEE addresses, Home Assistant entity IDs, user IDs, MQTT topics, IP addresses, credentials, access tokens or other installation-specific secrets.
