# BEOK TRV-705ZB Home Assistant cards

Dependency-free Lovelace custom cards for the BEOK TRV-705ZB Zigbee2MQTT converter.

The implementation is in [`cards/beok-trv705zb-card.js`](../cards/beok-trv705zb-card.js) and registers two card types:

- `custom:beok-trv705zb-status-card`
- `custom:beok-trv705zb-full-card`

## Status card

Compact daily-control card, suitable for wall tablets and restricted dashboards.

```yaml
type: custom:beok-trv705zb-status-card
entity: climate.example_trv
```

It shows current room temperature, target/Boost countdown, preset, heating state, valve position, window state and battery. It provides touch-friendly target controls and an icon-based preset selector.

Vacation duration is shown only while Vacation is active. During Boost, the normal target is replaced by a local countdown display and target controls are hidden.

## Full card

```yaml
type: custom:beok-trv705zb-full-card
entity: climate.example_trv
```

The full card includes the status controls plus collapsible sections for:

- preset temperatures
- regulation mode, upper limit, hysteresis and temperature calibration
- window detection, frost protection and child lock
- Vacation and Boost settings
- display settings
- seven-day schedule editor
- enhanced-variant controls when those Home Assistant entities exist
- Reset All Settings

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

## Missing numeric reports

Some TRVs do not report every configurable value immediately after pairing or restart. For selected writable settings the card can display the converter's known Reset All default as a fallback.

The fallback is not silently written to the device. The user must press the displayed default value or use the +/- control before a write occurs.

This applies to values such as antifrost temperature, comfort/eco temperatures, upper temperature limit, hysteresis, temperature calibration, Vacation duration and Boost duration.

## Installation

Copy:

```text
cards/beok-trv705zb-card.js
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

During development or upgrades, a query suffix can be used to avoid browser cache, for example:

```text
/local/beok-trv705zb-card.js?v=1.8
```

Then hard-refresh the browser.

## Dashboard visibility

The two card types are intentionally separate. Home Assistant's normal card/dashboard visibility rules can be used so a wall-tablet user sees only the status card while an administrative user sees the full settings card.

## Privacy

The distributed card contains no hard-coded device IEEE addresses, Home Assistant entity IDs, user IDs, MQTT topics, IP addresses, credentials, access tokens or other installation-specific secrets.
