# BEOK TRV-705ZB Zigbee2MQTT converter

Custom Zigbee2MQTT external converter for the BEOK TRV-705ZB thermostatic radiator valve family.

The converter supports two observed hardware/firmware capability variants which use the same Zigbee fingerprint.

## Supported fingerprint

Support is claimed for this exact fingerprint:

| Field | Value |
| --- | --- |
| Zigbee model (`modelID`) | `TS0601` |
| Manufacturer (`manufacturerName`) | `_TZE284_ltwbm23f` |
| Vendor | `BEOK` |
| Converter model | `TRV-705ZB` |

The converter file is [`converters/beok-trv705zb.mjs`](../converters/beok-trv705zb.mjs).

Other devices reporting `TS0601` are not covered by this support claim.

## Two capability variants

Two visually identical TRV-705ZB units have been observed with the same:

- Zigbee `modelID`
- Tuya `manufacturerName`
- application version

The Zigbee fingerprint therefore cannot distinguish the variants.

The enhanced variant is detected dynamically only after the device reports:

`DP125 = 0x170B` (`5899`)

This exact datapoint/value pair was observed in the enhanced-device capture and is the only marker used by the converter to enable enhanced controls.

`DP35`, `DP112`, and `DP110` are not used as capability markers because they are not sufficiently unique. In particular, the original variant also reports `DP110`, but it does not implement the enhanced Auto/Normal/Turbo thrust behavior.

The converter issues a Tuya `dataQuery` during configuration and after a device announce so the capability marker can be rediscovered without requiring a new pairing.

## Common features

Both observed variants support the following Zigbee2MQTT controls and state values:

- local temperature
- heating setpoint
- local temperature calibration
- battery level
- normal child lock
- running state
- preset/mode handling
- PID or ON-OFF regulation mode
- switch hysteresis
- upper temperature limit
- open-window detection and window state
- frost protection
- comfort temperature
- eco temperature
- antifrost temperature
- display brightness
- screen orientation
- valve position
- seven-day schedule with six transitions per day
- vacation mode and vacation day count
- boost mode and boost duration
- Reset All Settings action

### Presets

The exposed presets are:

- `off`
- `antifrost`
- `eco`
- `comfort`
- `custom`
- `program`
- `full_open`
- `vacation`
- `boost`

`custom` is derived when the current setpoint does not match the stored antifrost, eco, or comfort preset temperatures.

### Temperature ranges

| Property | Range | Step |
| --- | ---: | ---: |
| `current_heating_setpoint` | 5–35 °C | 0.5 °C |
| `local_temperature_calibration` | -10–10 °C | 0.1 °C |
| `switch_hysteresis` | 0.5–5 °C | 0.1 °C |
| `upper_temperature_limit` | 20–35 °C | 0.5 °C |
| `comfort_temperature` | 15.5–35 °C | 0.5 °C |
| `eco_temperature` | 5.5–20.5 °C | 0.5 °C |
| `antifrost_temperature` | 5–14.5 °C | 0.5 °C |

Changing `switch_hysteresis` also switches the device to ON-OFF regulation. The capture showed successful hysteresis writes while `DP127=1`, and the converter therefore sends the ON-OFF mode and hysteresis value together in one Tuya request.

## Enhanced-variant features

These controls are exposed only after `DP125=0x170B` has identified the enhanced variant.

### Temporary mode

Values:

- `enabled`
- `disabled`

When enabled, a manually changed temperature is automatically returned to the programmed schedule at the next scheduled transition.

This setting is encoded in the `DP126` settings bitmap using bit `0x1000`.

### Critical low battery action

Values:

- `close_valve`
- `open_valve_30`

This setting controls what the TRV should do when the battery reaches the critical-low level.

The stable captured states use the `0x0400` bit in `DP126`. An intermediate `0x0200` state was observed during the vendor-app transaction and is deliberately not exposed as a separate user-selectable option.

### Enhanced child lock

`enhanced_child_lock` provides the vendor application's "Double protection" option.

Values:

- `OFF`
- `ON`

It uses bit `0x4000` in `DP126`.

This is separate from the normal Zigbee2MQTT `child_lock` control on DP7.

### Thrust mode

Values:

- `auto`
- `normal`
- `turbo`

The enhanced variant uses `DP110` as:

| Raw value | Mode |
| ---: | --- |
| 0 | `turbo` |
| 1 | `normal` |
| 2 | `auto` |

Selecting `auto` starts the valve calibration sequence observed in the vendor app.

The original variant can also report DP110, so `thrust_mode` is intentionally hidden unless the enhanced variant has first been confirmed by `DP125=0x170B`.

### Valve calibration status

The enhanced variant exposes the read-only `valve_calibration` state:

- `idle`
- `running`
- `completed`

During automatic calibration, bit `0x2000` in `DP126` is set. When the TRV clears that bit after calibration, the converter publishes `completed`.

## Reset All Settings

Both variants expose:

`reset_all_settings = RESET`

The vendor application does not use one dedicated factory-reset datapoint for this operation. Instead, it writes the observed default configuration values back to the TRV. The converter reproduces that behavior.

The reset sequence restores the observed defaults for:

- ON-OFF regulation
- 30 °C upper temperature limit
- window detection off
- 0.5 °C hysteresis
- 0 °C local-temperature calibration
- frost protection on
- 20 °C comfort temperature
- 15 °C eco temperature
- 5 °C antifrost temperature
- high display brightness
- upright screen orientation
- the captured default seven-day schedule

On the enhanced variant it additionally restores the captured enhanced settings bitmap and Auto thrust mode.

Use this action with care because it changes multiple TRV settings.

## Capture-derived Tuya datapoints

The implementation is based on decrypted Zigbee/Tuya captures of the actual devices.

| DP | Function |
| ---: | --- |
| 2 | device preset/mode |
| 3 | running state |
| 4 | heating setpoint, /10 °C |
| 5 | local temperature, /10 °C |
| 6 | battery |
| 7 | normal child lock |
| 9 | upper temperature limit, /10 °C |
| 14 | window detection |
| 15 | window state |
| 47 | local temperature calibration, signed int32 /10 °C |
| 102–108 | Monday–Sunday schedules |
| 110 | enhanced thrust mode after capability detection |
| 111 | display brightness |
| 113 | screen orientation |
| 114 | valve position, /10 |
| 115 | switch hysteresis, /10 °C |
| 117 | vacation days / vacation active value |
| 118 | boost duration / active countdown value |
| 119 | comfort temperature, /10 °C |
| 120 | eco temperature, /10 °C |
| 121 | antifrost temperature, /10 °C |
| 122 | frost protection |
| 125 | enhanced capability marker; `0x170B` identifies the enhanced variant |
| 126 | vacation companion command and enhanced settings/status bitmap |
| 127 | regulation mode: 0 = PID, 1 = ON-OFF |

Vacation start was captured as one Tuya request containing both `DP117=<days>` and `DP126=69`.

## Installation

1. Copy `converters/beok-trv705zb.mjs` into the `external_converters` directory beside the Zigbee2MQTT data/configuration files.
2. Ensure external JavaScript converters are enabled for the installation.
3. Restart Zigbee2MQTT.
4. Check the Zigbee2MQTT log to confirm that the external converter was loaded.
5. Reconfigure the device or wait for a device announce if the enhanced controls have not yet appeared. The converter sends a Tuya `dataQuery` during those events to request the capability datapoints.

For Home Assistant OS with the Zigbee2MQTT app/add-on and the usual data path, the destination is typically:

`/config/zigbee2mqtt/external_converters/beok-trv705zb.mjs`

Consult the [official Zigbee2MQTT external converter documentation](https://www.zigbee2mqtt.io/advanced/more/external_converters.html) if your installation uses a different data-directory layout.

## Zigbee2MQTT frontend numeric-input note

During testing, a Zigbee2MQTT frontend behavior was observed with numeric exposes: moving a slider generated the expected Zigbee2MQTT `set` operation, while using the small up/down spinner arrows in the numeric edit field could change the displayed value without immediately sending a `set` command.

This was observed on multiple numeric properties and is not specific to this converter. If a numeric change appears to move in the UI but the TRV does not react, verify in the Zigbee2MQTT log that a `set` operation was actually published. Slider changes were confirmed to generate the write correctly in the tested frontend.

## Compatibility and safety

- The converter deliberately supports only `TS0601 / _TZE284_ltwbm23f`.
- The enhanced feature set is not inferred from appearance, product name, DP110, or the Zigbee fingerprint.
- Enhanced writes are blocked until the exact `DP125=0x170B` marker has been observed for that device.
- `DP126=69` is treated as the vacation companion command, not as the enhanced settings bitmap.
- The converter uses one custom fromZigbee path and one custom toZigbee path to avoid multiple handlers interpreting the same Tuya message.

The implementation has been validated against both observed physical variants. Future firmware revisions using the same fingerprint may require additional capture-based verification.
