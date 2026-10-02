# TS0505B Home Assistant Lovelace cards

Dependency-free Lovelace custom cards for Home Assistant lights exposed by the TS0505B converter and, when configured, its group extension.

The source is [`homeassistant/www/ts0505b-card.js`](../homeassistant/www/ts0505b-card.js). It registers two card types:

- `custom:ts0505b-status-card`
- `custom:ts0505b-full-card`

## Status card

Use this card for the light's everyday controls:

```yaml
type: custom:ts0505b-status-card
entity: light.example_ts0505b
```

It provides a power button and a wide brightness slider. The slider color follows the current color or color temperature. Open the adjustment panel beside the slider for color temperature, XY color selection, and available color presets. Controls appear according to the light's supported color modes.

## Full card

The full card adds the converter's available Startup, Scene, and Rhythm controls:

```yaml
type: custom:ts0505b-full-card
entity: light.example_ts0505b
```

The `example_ts0505b` part is a placeholder; replace it with the object ID of your own light. The card derives related entity IDs from that object ID using the converter's suffixes. Sections appear only when the corresponding entities are available.

The collapsible sections include:

- **Startup:** startup behavior, color mode, custom startup color controls, and Do Not Disturb.
- **Scene:** scene selection, dynamic effect, numeric speed controls, enabled state, and scene-point controls when those entities are present.
- **Rhythm:** master enable, mode, day selection, and up to eight configurable time slots. Each active slot has a touch-friendly time picker, name, brightness, and color temperature controls. Inactive slots are visibly dimmed.

The same compact color editor is used for the main light and custom Startup/Scene color controls. The XY advanced controls use large step buttons and retain their expanded state while the card updates. The native time input keeps focus while changing the hour and minute.

## Language

All card-owned controls, labels, presets, and accessibility text follow the Home Assistant frontend language. Hungarian is used when the frontend language is Hungarian (`hu` or a regional variant); English is the default for every other language or when no language is available. Entity names, state values, and options are supplied by Home Assistant and remain unchanged.

These sections depend on the converter or group extension exposing the matching Home Assistant entities. The card does not create missing entities.

## Installation

Copy `homeassistant/www/ts0505b-card.js` from this repository to Home Assistant's `www` directory, for example:

```text
/config/www/ts0505b-card.js
```

Add a dashboard resource with type **JavaScript Module**:

```text
/local/ts0505b-card.js?v=7
```

Then add either card using the YAML above. After replacing the JavaScript in `www` during a future update, increase the query version (for example, `v=8`) and reload the dashboard so the browser downloads the new file.

## Privacy

The distributed JavaScript contains no hard-coded device IEEE address, Home Assistant entity ID, user ID, MQTT topic, IP address, credential, access token, or installation-specific identifier. The example entity ID in this document is a placeholder.
