# BSEED TS0003 three-gang Zigbee2MQTT converter

External converter with independent relay control and custom per-channel inching (timed auto-off).

Support is claimed only for this exact fingerprint:

| Field | Value |
| --- | --- |
| Zigbee model (`modelID`) | `TS0003` |
| Manufacturer (`manufacturerName`) | `_TZ3000_qkixdnon` |
| Vendor | `BSEED` |
| Converter model | `TS0003_qkixdnon` |

Other devices reporting `TS0003` are not covered by this support claim.

## Endpoints and features

| Relay | Zigbee endpoint | Inching channel |
| --- | --- | --- |
| `left` | 1 | 1 |
| `center` | 2 | 2 |
| `right` | 3 | 3 |

The Tuya extension enables relay on/off control, switch type, power-on behavior, backlight on/off mode, indicator mode, and on/off countdown. Device configuration sends the Tuya magic packet and binds `genOnOff` on endpoints 1, 2, and 3 to the coordinator.

Custom inching provides independent enable/disable settings and auto-off delays for all three relays. The built-in Zigbee2MQTT `inchingSwitch` implementation is intentionally not used because this converter implements the device's capture-derived encoding.

## Installation

1. Copy `converters/TS0003_TZ3000_qkixdnon_3gang.mjs` into the `external_converters` directory beside your Zigbee2MQTT `configuration.yaml` file. The destination relative to the Zigbee2MQTT data directory is `external_converters/TS0003_TZ3000_qkixdnon_3gang.mjs`.
2. Ensure external JavaScript converters are enabled for your installation; consult the official documentation for the `enable_external_js` setting where applicable.
3. Restart Zigbee2MQTT after installation and check that the converter loads and the device matches the fingerprint above.

See the [official Zigbee2MQTT external converter documentation](https://www.zigbee2mqtt.io/advanced/more/external_converters.html) for directory placement and enablement details.

## Inching settings

The set-only composite `inching_control_set` accepts these fields:

| Channel | Enable field | Time field |
| --- | --- | --- |
| Left | `inching_control_1` | `inching_time_1` |
| Center | `inching_control_2` | `inching_time_2` |
| Right | `inching_control_3` | `inching_time_3` |

Enable values exposed in the interface are `ENABLE` and `DISABLE`. Times are integer seconds in the range **1..65535**, inclusive. The converter also accepts `true`, `1`, or `ON` for enable and `false`, `0`, or `OFF` for disable.

Example settings object:

```json
{
  "inching_control_set": {
    "inching_control_1": "ENABLE",
    "inching_time_1": 2,
    "inching_control_2": "DISABLE",
    "inching_time_2": 2,
    "inching_control_3": "ENABLE",
    "inching_time_3": 10
  }
}
```

Partial updates are merged in this order: defaults, an in-memory per-device cache, any previous settings in Zigbee2MQTT state, and the current update. Null, undefined, and empty-string fields are ignored. Defaults disable all channels and use 2-second delays. Every update transmits all three channels. The cache and returned state are updated only after the Zigbee command succeeds.

The cache does not persist across converter reloads or process restarts. If previous settings are unavailable, unspecified channels use defaults. The converter provides no custom inching readback or report decoder; returned settings represent the successfully sent configuration rather than independently read device state.

## Inching protocol

Each channel uses a **3-byte record**:

- Byte 0: `controlByte = ((channel - 1) << 1) | enabled`, where channel is 1, 2, or 3 and enabled is 0 or 1. Bits 7–1 encode the zero-based channel index; bit 0 is the enable flag.
- Byte 1: high byte of the timeout in seconds.
- Byte 2: low byte of the timeout in seconds.

The timeout is an unsigned **big-endian 16-bit** value. Each record is Base64 encoded separately, then the three strings are concatenated in channel order and converted to an **ASCII payload**. The payload is 12 ASCII bytes, not the raw nine-byte record buffer. Since each record is three bytes, encoding the combined nine bytes as Base64 would produce the same text.

For all three channels enabled with 2-second delays:

| Channel | Raw record (hex) | Base64 text |
| --- | --- | --- |
| 1 | `01 00 02` | `AQAC` |
| 2 | `03 00 02` | `AwAC` |
| 3 | `05 00 02` | `BQAC` |

The resulting ASCII payload is `AQACAwACBQAC`.

**All inching commands are sent through endpoint 1**, using Tuya private cluster `0xE000`, registered as `manuSpecificTuya4`, and command `setInchingSwitch`:

```js
await meta.device.getEndpoint(1).command(
    "manuSpecificTuya4",
    "setInchingSwitch",
    {payload},
);
```

## Compatibility and verification scope

No minimum Zigbee2MQTT version is claimed. The converter requires the Zigbee2MQTT external-converter runtime and compatible `zigbee-herdsman-converters` APIs, including:

- `lib/exposes` presets/access and composite feature builders.
- `lib/reporting.bind`.
- `lib/tuya` functions `modernExtend.tuyaBase`, `modernExtend.tuyaOnOff`, `configureMagicPacket`, and `clusters.addTuyaCommonPrivateCluster`.
- Support for the `tuyaOnOff` options `endpoints`, `switchType`, `powerOnBehavior2`, `backlightModeOffOn`, `indicatorMode`, and `onOffCountdown`.
- A registered `manuSpecificTuya4` / `setInchingSwitch` command accepting `{payload}` with a Buffer value.

The JavaScript runtime must support ES modules, `Buffer`, optional chaining, and nullish coalescing. Syntax validation alone does not establish dependency compatibility or hardware behavior. No device-firmware compatibility matrix or runtime integration results are supplied with this package.

## Privacy and provenance

The converter contains no hard-coded device IEEE addresses, installation friendly names, MQTT topics, Home Assistant entity IDs, IP addresses, or credentials. It reads a device's IEEE address at runtime solely as an in-memory cache key.

Source comments describe the inching encoding as capture-derived but provide no capture origin, author attribution, source URL, copyright notice, or license declaration. This package adds no author attribution or license; redistribution rights are not established by the source file alone. The converter is an unchanged byte-for-byte copy of the supplied source.
