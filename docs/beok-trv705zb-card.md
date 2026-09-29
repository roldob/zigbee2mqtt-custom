# BEOK TRV-705ZB Home Assistant Lovelace cards

Dependency-free Home Assistant Lovelace cards for the custom BEOK TRV-705ZB Zigbee2MQTT converter.

JavaScript resource:

[`cards/beok-trv705zb-card.js`](../cards/beok-trv705zb-card.js)

The single JavaScript file registers two separate custom cards:

- `custom:beok-trv705zb-status-card`
- `custom:beok-trv705zb-full-card`

## Status card

Designed for normal daily operation and wall-mounted tablets.

```yaml
type: custom:beok-trv705zb-status-card
entity: climate.example_trv
```

It provides:

- room temperature
- target temperature
- current preset
- heating/idle state
- valve position
- window state
- battery
- large touch-friendly target temperature controls
- icon-based preset selector
- Vacation duration while Vacation is active
- live local Boost countdown while Boost is active

During Boost the target temperature is intentionally hidden because Boost opens the valve fully for the configured duration. The Target tile is replaced by a BOOST countdown.

## Full card

```yaml
type: custom:beok-trv705zb-full-card
entity: climate.example_trv
```

Includes all status controls plus collapsible sections for:

- Preset temperatures
- Regulation
- Protection
- Vacation & Boost
- Display
- Schedule
- Enhanced functions when supported by the detected TRV variant
- Advanced / Reset All Settings

The full card includes a touch-friendly 7-day × 6-period schedule editor.

## Entity discovery

Normally only the climate entity has to be configured.

The card reads the Home Assistant entity registry, identifies the selected climate entity's `device_id`, and discovers the related Zigbee2MQTT entities belonging to the same Home Assistant device.

Individual entity IDs can still be overridden when required:

```yaml
type: custom:beok-trv705zb-full-card
entity: climate.example_trv
entities:
  comfort_temperature: number.example_comfort_temperature
  schedule_monday: text.example_schedule_monday
```

No installation-specific identifiers are hard-coded in the card.

## Missing initial values

Some TRV units do not report every configuration datapoint immediately after pairing or startup.

For writable numeric controls, the card can display the converter's captured Reset All default as a fallback so the control remains usable. The fallback is not silently written to the TRV simply by opening the dashboard.

Current fallback values:

| Setting | Fallback |
| --- | ---: |
| Switch hysteresis | 0.5 °C |
| Upper temperature limit | 30 °C |
| Comfort temperature | 20 °C |
| Eco temperature | 15 °C |
| Antifrost temperature | 5 °C |
| Temperature calibration | 0 °C |
| Vacation duration | 1 day |
| Boost duration | 30 min |

If a schedule has not been reported, the editor shows the captured Reset All schedule as an editable fallback. It is written only when Save day / Save all is used.

Read-only values such as window state are never fabricated. They remain unknown until the TRV reports the relevant datapoint.

## Installation

Copy:

```text
cards/beok-trv705zb-card.js
```

to the Home Assistant `www` directory, for example:

```text
/config/www/beok-trv705zb-card.js
```

Add it as a Dashboard Resource of type **JavaScript Module**:

```text
/local/beok-trv705zb-card.js
```

During development or upgrades, a cache-busting suffix can be used:

```text
/local/beok-trv705zb-card.js?v=8
```

Then hard-refresh the browser.

## Separate user-facing dashboards

The status and full cards are intentionally separate card types. Home Assistant dashboard/card visibility can therefore expose only the compact status card to a wall-tablet user while a maintenance/admin dashboard uses the full card.

User IDs and visibility rules are not embedded in the JavaScript.

## Version

Current published card version: **1.8.0**
