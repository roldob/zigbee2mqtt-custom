// BEOK TRV-705ZB / TS0601 / _TZE284_ltwbm23f
// Zigbee2MQTT external converter
//
// v12: supports both observed BEOK TRV-705ZB firmware/capability variants.
// The enhanced variant has the same TS0601/_TZE284_ltwbm23f fingerprint and
// appVersion as the original, so fingerprinting cannot distinguish them.
//
// IMPORTANT: enhanced capability is enabled ONLY after the device reports
// DP125 with the sniff-verified marker value 0x170B (5899).
// DP35, DP112 and DP110 are NOT sufficient markers because they can also be
// present on the original variant.
//
// A new meta key is used in v12 so stale v11 capability flags are ignored.
// Switch hysteresis SET is sent atomically with DP127=1 (ON-OFF), because
// the sniffed successful DP115 writes all occurred while regulation mode
// was ON-OFF.
// There is exactly ONE fromZigbee converter and ONE toZigbee converter.
// No generic tuya.fz.datapoints / tuya.tz.datapoints are mixed with custom
// handlers, so state values cannot be overwritten by a second converter.
//
// Verified from TRV.pcapng:
//   DP47  = local temperature calibration, signed int32, /10 °C
//   DP115 = switch hysteresis, /10 °C
//   DP117 = vacation days/status; vacation start sends requested days
//   DP126 = vacation command, value 69 (0x45) together with DP117
//   DP127 = regulation mode: 0=PID, 1=ON-OFF
//
// Established TRV602Z-family behaviour used for boost:
//   DP118 = boost minutes; 30/60/90/120 starts, 0 cancels/expires
//
// DP2 device mode:
//   0=off, 1=antifrost, 2=eco, 3=comfort, 4=program, 5=full_open
//
// "custom" is derived when the setpoint differs from the fixed
// antifrost/eco/comfort temperatures.

import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import * as tuya from 'zigbee-herdsman-converters/lib/tuya';

const e = exposes.presets;
const ea = exposes.access;

const vacationDaysCache = new Map();
const boostDurationCache = new Map();

const META_ENHANCED = 'beokTrv705EnhancedDp125_170B_v12';
const META_DP126 = 'beokTrv705Dp126';

const markCapability = (device, meta, key, value = true) => {
    if (!device || device.meta?.[key] === value) return;
    device.meta ??= {};
    device.meta[key] = value;
    device.save();
    meta?.deviceExposesChanged?.();
};

const storeDeviceMeta = (device, key, value) => {
    if (!device || device.meta?.[key] === value) return;
    device.meta ??= {};
    device.meta[key] = value;
    device.save();
};

const isEnhancedVariant = (device) => device?.meta?.[META_ENHANCED] === true;

const enhancedDp126Base = (device) => {
    let raw = Number(device?.meta?.[META_DP126] ?? 7);
    // 69 (0x45) is the separate Vacation command, not the enhanced settings bitmap.
    if (!Number.isFinite(raw) || raw === 69) raw = 7;
    // 0x0200 was only observed as an intermediate Protection Options value.
    // 0x2000 is the transient valve calibration-running bit.
    return raw & ~0x2200;
};

const writeEnhancedDp126 = async (entity, meta, raw) => {
    await tuya.sendDataPointValue(entity, 126, raw);
    storeDeviceMeta(meta?.device, META_DP126, raw);
};

const cacheKey = (entity, meta) =>
    meta?.device?.ieeeAddr ??
    entity?.deviceIeeeAddress ??
    entity?.ieeeAddr ??
    'default';

const numberFromBufferSigned = (data) => {
    let value = 0;
    for (const byte of data) {
        value = (value << 8) + byte;
    }
    return value;
};

const numberFromBufferUnsigned = (data) => {
    let value = 0;
    for (const byte of data) {
        value = ((value << 8) + byte) >>> 0;
    }
    return value >>> 0;
};

const getDpValue = (dpValue) => {
    const data = Array.from(dpValue.data ?? []);

    switch (dpValue.datatype) {
        case 0: // raw
            return data;
        case 1: // bool
            return data[0] === 1;
        case 2: // 4-byte signed value
            return numberFromBufferSigned(data);
        case 3: // string
            return String.fromCharCode(...data);
        case 4: // enum
            return data[0];
        case 5: // bitmap
            return numberFromBufferUnsigned(data);
        default:
            return undefined;
    }
};

const modeToPreset = {
    0: 'off',
    1: 'antifrost',
    2: 'eco',
    3: 'comfort',
    4: 'program',
    5: 'full_open',
};

const presetToMode = {
    off: 0,
    antifrost: 1,
    eco: 2,
    comfort: 3,
    program: 4,
    full_open: 5,
};

const brightnessFrom = {0: 'high', 1: 'medium', 2: 'low'};
const brightnessTo = {high: 0, medium: 1, low: 2};

const orientationFrom = {0: 'up', 1: 'down'};
const orientationTo = {up: 0, down: 1};

const thrustFrom = {0: 'turbo', 1: 'normal', 2: 'auto'};
const thrustTo = {turbo: 0, normal: 1, auto: 2};

const scheduleDpToDay = {
    102: 1,
    103: 2,
    104: 3,
    105: 4,
    106: 5,
    107: 6,
    108: 7,
};

const scheduleKeyToDp = {
    schedule_monday: 102,
    schedule_tuesday: 103,
    schedule_wednesday: 104,
    schedule_thursday: 105,
    schedule_friday: 106,
    schedule_saturday: 107,
    schedule_sunday: 108,
};

const scheduleConverter = (day) =>
    tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(day);

const defaultSchedulePayload = (day) => Buffer.from([
    day,
    0xc1, 0x68, 0x30, 0xc8,
    0xc1, 0xe0, 0x20, 0x96,
    0xc2, 0xd0, 0x30, 0xc8,
    0xc3, 0x48, 0x20, 0x96,
    0xc4, 0x38, 0x30, 0xc8,
    0xc5, 0x28, 0x20, 0x96,
]);

const derivePreset = (mode, setpoint, state) => {
    if (mode === undefined || mode === null) return undefined;

    const numericMode =
        typeof mode === 'number' ? mode :
        Object.entries(modeToPreset).find(([, name]) => name === mode)?.[0];

    const m = Number(numericMode);
    let preset = modeToPreset[m];
    if (!preset) return undefined;

    if ([1, 2, 3].includes(m) && Number.isFinite(Number(setpoint))) {
        const sp = Number(setpoint);
        const anti = Number(state.antifrost_temperature);
        const eco = Number(state.eco_temperature);
        const comfort = Number(state.comfort_temperature);

        const matchesKnown =
            (Number.isFinite(anti) && Math.abs(sp - anti) < 0.05) ||
            (Number.isFinite(eco) && Math.abs(sp - eco) < 0.05) ||
            (Number.isFinite(comfort) && Math.abs(sp - comfort) < 0.05);

        if (!matchesKnown) preset = 'custom';
    }

    return preset;
};

const fzBeok = {
    cluster: 'manuSpecificTuya',
    type: [
        'commandDataResponse',
        'commandDataReport',
        'commandActiveStatusReport',
        'commandActiveStatusReportAlt',
    ],

    convert: (model, msg, publish, options, meta) => {
        const result = {};

        let receivedMode;
        let receivedSetpoint;
        let receivedVacation;
        let receivedBoost;

        const dpValues = msg.data.dpValues ?? [];
        const hasEnhancedMarker = dpValues.some(
            (dpValue) => dpValue.dp === 125 && Number(getDpValue(dpValue)) === 0x170b,
        );

        if (hasEnhancedMarker) {
            markCapability(meta.device, meta, META_ENHANCED, true);
        }

        for (const dpValue of dpValues) {
            const dp = dpValue.dp;
            const value = getDpValue(dpValue);

            switch (dp) {
                case 2:
                    receivedMode = Number(value);
                    result.device_mode = modeToPreset[receivedMode];
                    break;

                case 3:
                    result.running_state = Number(value) === 1 ? 'heat' : 'idle';
                    break;

                case 4:
                    receivedSetpoint = Number(value) / 10;
                    result.current_heating_setpoint = receivedSetpoint;
                    break;

                case 5:
                    result.local_temperature = Number(value) / 10;
                    break;

                case 6:
                    result.battery = Number(value);
                    break;

                case 7:
                    result.child_lock = value ? 'LOCK' : 'UNLOCK';
                    break;

                case 9:
                    result.upper_temperature_limit = Number(value) / 10;
                    break;

                case 14:
                    result.window_detection = value ? 'ON' : 'OFF';
                    break;

                case 15:
                    result.window = Number(value) === 1 ? 'OPEN' : 'CLOSE';
                    break;

                case 35:
                case 112:
                    // Observed on the enhanced capture, but not unique enough to use
                    // as a variant marker. Keep ignored.
                    break;

                case 125:
                    // Exact enhanced-variant marker captured at startup: 0x170B.
                    // Other DP125 values must NOT enable enhanced controls.
                    if (Number(value) === 0x170b) {
                        markCapability(meta.device, meta, META_ENHANCED, true);
                    }
                    break;

                case 47:
                    // datatype 2 is already decoded as signed int32 above.
                    result.local_temperature_calibration = Number(value) / 10;
                    break;

                case 102:
                case 103:
                case 104:
                case 105:
                case 106:
                case 107:
                case 108: {
                    const day = scheduleDpToDay[dp];
                    const key = Object.entries(scheduleKeyToDp).find(([, id]) => id === dp)?.[0];
                    if (key) {
                        result[key] = scheduleConverter(day).from(value, meta, options, publish, msg);
                    }
                    break;
                }

                case 110:
                    // The original variant also reports DP110, but does not support
                    // the enhanced Auto/Normal/Turbo behaviour. Only expose/decode it
                    // after the exact DP125=0x170B marker has identified the variant.
                    if (hasEnhancedMarker || isEnhancedVariant(meta.device)) {
                        result.thrust_mode = thrustFrom[Number(value)];
                    }
                    break;

                case 111:
                    result.display_brightness = brightnessFrom[Number(value)];
                    break;

                case 113:
                    result.screen_orientation = orientationFrom[Number(value)];
                    break;

                case 114:
                    result.position = Number(value) / 10;
                    break;

                case 115:
                    result.switch_hysteresis = Number(value) / 10;
                    break;

                case 117:
                    receivedVacation = Number(value);
                    result.vacation_days_active = receivedVacation;
                    result.vacation = receivedVacation > 0 ? 'ON' : 'OFF';

                    // DP117 is the requested number of days when Vacation is active.
                    // Do not overwrite the configured value on cancel (0).
                    if (receivedVacation > 0) {
                        result.vacation_days = receivedVacation;
                        vacationDaysCache.set(meta.device.ieeeAddr, receivedVacation);
                    }
                    break;

                case 118:
                    receivedBoost = Number(value);
                    result.boost_minutes_active = receivedBoost;
                    result.boost = receivedBoost > 0 ? 'ON' : 'OFF';

                    // Preserve last selected duration when boost ends (DP118=0).
                    if ([30, 60, 90, 120].includes(receivedBoost)) {
                        result.boost_duration = receivedBoost;
                        boostDurationCache.set(meta.device.ieeeAddr, receivedBoost);
                    }
                    break;

                case 119:
                    result.comfort_temperature = Number(value) / 10;
                    break;

                case 120:
                    result.eco_temperature = Number(value) / 10;
                    break;

                case 121:
                    result.antifrost_temperature = Number(value) / 10;
                    break;

                case 122:
                    result.frost_protection = value ? 'ON' : 'OFF';
                    break;

                case 126: {
                    const raw = Number(value);

                    // DP126=69 (0x45) is the Vacation start companion command and
                    // exists on the original variant too. Never interpret it as the
                    // enhanced settings bitmap.
                    if (raw === 69 || !isEnhancedVariant(meta.device)) break;

                    const previousRaw = Number(meta.device?.meta?.[META_DP126] ?? 7);
                    storeDeviceMeta(meta.device, META_DP126, raw);

                    result.temporary_mode = (raw & 0x1000) !== 0 ? 'disabled' : 'enabled';
                    result.enhanced_child_lock = (raw & 0x4000) !== 0 ? 'ON' : 'OFF';

                    // 0x0200 was observed as a transient/intermediate Protection Options
                    // value. Only publish the two stable low-battery actions.
                    if ((raw & 0x0200) === 0) {
                        result.critical_low_battery_action =
                            (raw & 0x0400) !== 0 ? 'open_valve_30' : 'close_valve';
                    }

                    const wasCalibrating = (previousRaw & 0x2000) !== 0;
                    const isCalibrating = (raw & 0x2000) !== 0;
                    if (isCalibrating) {
                        result.valve_calibration = 'running';
                    } else if (wasCalibrating) {
                        result.valve_calibration = 'completed';
                    } else {
                        result.valve_calibration = 'idle';
                    }
                    break;
                }

                case 127:
                    result.system_mode = Number(value) === 0 ? 'pid' : 'on-off';
                    break;

                default:
                    // Unknown/unused DP: deliberately ignored.
                    break;
            }
        }

        const currentMode =
            receivedMode ??
            (typeof meta.state.device_mode === 'string'
                ? presetToMode[meta.state.device_mode]
                : meta.state.device_mode);

        const currentSetpoint =
            receivedSetpoint ?? meta.state.current_heating_setpoint;

        const currentVacation =
            receivedVacation ?? Number(meta.state.vacation_days_active ?? 0);

        const currentBoost =
            receivedBoost ?? Number(meta.state.boost_minutes_active ?? 0);

        // Temporary override priority.
        if (currentBoost > 0) {
            result.preset = 'boost';
        } else if (currentVacation > 0) {
            result.preset = 'vacation';
        } else {
            // On Vacation cancel/expiry, restore the preset that was active before it.
            if (receivedVacation === 0 && meta.state.preset_before_vacation) {
                result.preset = meta.state.preset_before_vacation;
            }

            const derived = derivePreset(currentMode, currentSetpoint, {
                ...meta.state,
                ...result,
            });

            if (derived) result.preset = derived;
        }

        return result;
    },
};

const sendVacationStart = async (entity, days) => {
    // Exact packet structure observed in the supplied sniff:
    // DP117=<days> + DP126=69 in the same Tuya dataRequest.
    const dpValues = [
        {
            dp: 117,
            datatype: 2,
            data: Buffer.from(tuya.convertDecimalValueTo4ByteHexArray(days)),
        },
        {
            dp: 126,
            datatype: 2,
            data: Buffer.from(tuya.convertDecimalValueTo4ByteHexArray(69)),
        },
    ];

    await entity.command(
        'manuSpecificTuya',
        'dataRequest',
        {seq: 0, dpValues},
        {disableDefaultResponse: true},
    );
};

const tzBeok = {
    key: [
        'child_lock',
        'current_heating_setpoint',
        'local_temperature_calibration',
        'upper_temperature_limit',
        'window_detection',
        'schedule_monday',
        'schedule_tuesday',
        'schedule_wednesday',
        'schedule_thursday',
        'schedule_friday',
        'schedule_saturday',
        'schedule_sunday',
        'display_brightness',
        'screen_orientation',
        'switch_hysteresis',
        'comfort_temperature',
        'eco_temperature',
        'antifrost_temperature',
        'frost_protection',
        'system_mode',
        'preset',
        'vacation_days',
        'vacation',
        'boost_duration',
        'boost',
        'temporary_mode',
        'critical_low_battery_action',
        'enhanced_child_lock',
        'thrust_mode',
        'reset_all_settings',
    ],

    convertSet: async (entity, key, value, meta) => {
        const state = {};
        const deviceKey = cacheKey(entity, meta);

        switch (key) {
            case 'child_lock': {
                const locked = value === 'LOCK' || value === true || value === 'ON';
                await tuya.sendDataPointBool(entity, 7, locked);
                state.child_lock = locked ? 'LOCK' : 'UNLOCK';
                break;
            }

            case 'current_heating_setpoint': {
                const temperature = Number(value);
                await tuya.sendDataPointValue(entity, 4, Math.round(temperature * 10));
                state.current_heating_setpoint = temperature;

                const derived = derivePreset(
                    presetToMode[meta.state.device_mode] ?? presetToMode[meta.state.preset],
                    temperature,
                    meta.state,
                );
                if (derived) state.preset = derived;
                break;
            }

            case 'local_temperature_calibration': {
                const calibration = Number(value);
                if (!Number.isFinite(calibration) || calibration < -10 || calibration > 10) {
                    throw new Error('local_temperature_calibration must be between -10 and 10 °C');
                }

                // sendDataPointValue supports signed values and encodes int32 two's complement.
                await tuya.sendDataPointValue(entity, 47, Math.round(calibration * 10));
                state.local_temperature_calibration = calibration;
                break;
            }

            case 'upper_temperature_limit': {
                const temperature = Number(value);
                if (temperature < 20 || temperature > 35) {
                    throw new Error('upper_temperature_limit must be between 20 and 35 °C');
                }
                await tuya.sendDataPointValue(entity, 9, Math.round(temperature * 10));
                state.upper_temperature_limit = temperature;
                break;
            }

            case 'window_detection': {
                const enabled = value === 'ON' || value === true;
                await tuya.sendDataPointBool(entity, 14, enabled);
                state.window_detection = enabled ? 'ON' : 'OFF';
                break;
            }

            case 'schedule_monday':
            case 'schedule_tuesday':
            case 'schedule_wednesday':
            case 'schedule_thursday':
            case 'schedule_friday':
            case 'schedule_saturday':
            case 'schedule_sunday': {
                const dp = scheduleKeyToDp[key];
                const day = scheduleDpToDay[dp];
                const payload = scheduleConverter(day).to(String(value));
                await tuya.sendDataPointRaw(entity, dp, Buffer.from(payload));
                state[key] = value;
                break;
            }

            case 'display_brightness': {
                if (!(value in brightnessTo)) throw new Error(`Invalid display_brightness: ${value}`);
                await tuya.sendDataPointEnum(entity, 111, brightnessTo[value]);
                state.display_brightness = value;
                break;
            }

            case 'screen_orientation': {
                if (!(value in orientationTo)) throw new Error(`Invalid screen_orientation: ${value}`);
                await tuya.sendDataPointEnum(entity, 113, orientationTo[value]);
                state.screen_orientation = value;
                break;
            }

            case 'switch_hysteresis': {
                const hysteresis = Number(value);
                if (!Number.isFinite(hysteresis) || hysteresis < 0.5 || hysteresis > 5) {
                    throw new Error('switch_hysteresis must be between 0.5 and 5.0 °C');
                }

                // The sniff proves DP115 is only changed while regulation mode
                // is ON-OFF (DP127=1). Send both DPs atomically so the device
                // cannot reject/normalize the hysteresis value while in PID mode.
                const dpValues = [
                    {
                        dp: 127,
                        datatype: 4,
                        data: Buffer.from([1]),
                    },
                    {
                        dp: 115,
                        datatype: 2,
                        data: Buffer.from(
                            tuya.convertDecimalValueTo4ByteHexArray(Math.round(hysteresis * 10)),
                        ),
                    },
                ];

                await entity.command(
                    'manuSpecificTuya',
                    'dataRequest',
                    {seq: 0, dpValues},
                    {disableDefaultResponse: true},
                );

                state.system_mode = 'on-off';
                state.switch_hysteresis = hysteresis;
                break;
            }

            case 'comfort_temperature': {
                const temperature = Number(value);
                if (temperature < 15.5 || temperature > 35) {
                    throw new Error('comfort_temperature must be between 15.5 and 35 °C');
                }
                await tuya.sendDataPointValue(entity, 119, Math.round(temperature * 10));
                state.comfort_temperature = temperature;
                break;
            }

            case 'eco_temperature': {
                const temperature = Number(value);
                if (temperature < 5.5 || temperature > 20.5) {
                    throw new Error('eco_temperature must be between 5.5 and 20.5 °C');
                }
                await tuya.sendDataPointValue(entity, 120, Math.round(temperature * 10));
                state.eco_temperature = temperature;
                break;
            }

            case 'antifrost_temperature': {
                const temperature = Number(value);
                if (temperature < 5 || temperature > 14.5) {
                    throw new Error('antifrost_temperature must be between 5 and 14.5 °C');
                }
                await tuya.sendDataPointValue(entity, 121, Math.round(temperature * 10));
                state.antifrost_temperature = temperature;
                break;
            }

            case 'frost_protection': {
                const enabled = value === 'ON' || value === true;
                await tuya.sendDataPointBool(entity, 122, enabled);
                state.frost_protection = enabled ? 'ON' : 'OFF';
                break;
            }

            case 'temporary_mode': {
                if (!isEnhancedVariant(meta.device)) {
                    throw new Error('temporary_mode is not reported by this TRV variant');
                }
                if (!['enabled', 'disabled'].includes(value)) {
                    throw new Error("temporary_mode must be 'enabled' or 'disabled'");
                }

                let raw = enhancedDp126Base(meta.device);
                raw = value === 'disabled' ? (raw | 0x1000) : (raw & ~0x1000);
                await writeEnhancedDp126(entity, meta, raw);
                state.temporary_mode = value;
                break;
            }

            case 'critical_low_battery_action': {
                if (!isEnhancedVariant(meta.device)) {
                    throw new Error('critical_low_battery_action is not reported by this TRV variant');
                }
                if (!['close_valve', 'open_valve_30'].includes(value)) {
                    throw new Error("critical_low_battery_action must be 'close_valve' or 'open_valve_30'");
                }

                let raw = enhancedDp126Base(meta.device) & ~0x0600;
                if (value === 'open_valve_30') raw |= 0x0400;
                await writeEnhancedDp126(entity, meta, raw);
                state.critical_low_battery_action = value;
                break;
            }

            case 'enhanced_child_lock': {
                if (!isEnhancedVariant(meta.device)) {
                    throw new Error('enhanced_child_lock is not reported by this TRV variant');
                }
                const enabled = value === 'ON' || value === true;
                let raw = enhancedDp126Base(meta.device);
                raw = enabled ? (raw | 0x4000) : (raw & ~0x4000);
                await writeEnhancedDp126(entity, meta, raw);
                state.enhanced_child_lock = enabled ? 'ON' : 'OFF';
                break;
            }

            case 'thrust_mode': {
                if (!isEnhancedVariant(meta.device)) {
                    throw new Error('thrust_mode is not supported by this TRV variant');
                }
                if (!(value in thrustTo)) throw new Error(`Invalid thrust_mode: ${value}`);

                await tuya.sendDataPointEnum(entity, 110, thrustTo[value]);
                state.thrust_mode = value;

                // On the enhanced variant selecting Auto is immediately followed
                // by DP126 bit 0x2000, which starts valve calibration.
                if (value === 'auto' && isEnhancedVariant(meta.device)) {
                    const raw = enhancedDp126Base(meta.device) | 0x2000;
                    await writeEnhancedDp126(entity, meta, raw);
                    state.valve_calibration = 'running';
                }
                break;
            }

            case 'reset_all_settings': {
                if (value !== 'RESET' && value !== 'reset') {
                    throw new Error("reset_all_settings must be 'RESET'");
                }

                // Exact Reset All sequence observed in both supplied captures.
                await tuya.sendDataPointEnum(entity, 127, 1);
                await tuya.sendDataPointValue(entity, 9, 300);
                await tuya.sendDataPointBool(entity, 14, false);
                await tuya.sendDataPointValue(entity, 115, 5);
                await tuya.sendDataPointValue(entity, 47, 0);
                await tuya.sendDataPointBool(entity, 122, true);
                await tuya.sendDataPointValue(entity, 119, 200);
                await tuya.sendDataPointValue(entity, 120, 150);
                await tuya.sendDataPointValue(entity, 121, 50);
                await tuya.sendDataPointEnum(entity, 111, 0);
                await tuya.sendDataPointEnum(entity, 113, 0);

                if (isEnhancedVariant(meta.device)) {
                    await writeEnhancedDp126(entity, meta, 7);
                    state.temporary_mode = 'enabled';
                    state.critical_low_battery_action = 'close_valve';
                    state.enhanced_child_lock = 'OFF';
                    state.valve_calibration = 'idle';
                }

                for (let day = 1; day <= 7; day++) {
                    await tuya.sendDataPointRaw(entity, 101 + day, defaultSchedulePayload(day));
                }

                await tuya.sendDataPointEnum(entity, 110, 2);

                state.system_mode = 'on-off';
                state.upper_temperature_limit = 30;
                state.window_detection = 'OFF';
                state.switch_hysteresis = 0.5;
                state.local_temperature_calibration = 0;
                state.frost_protection = 'ON';
                state.comfort_temperature = 20;
                state.eco_temperature = 15;
                state.antifrost_temperature = 5;
                state.display_brightness = 'high';
                state.screen_orientation = 'up';
                if (isEnhancedVariant(meta.device)) state.thrust_mode = 'auto';
                break;
            }

            case 'system_mode': {
                if (!['pid', 'on-off'].includes(value)) {
                    throw new Error("system_mode must be 'pid' or 'on-off'");
                }
                await tuya.sendDataPointEnum(entity, 127, value === 'pid' ? 0 : 1);
                state.system_mode = value;
                break;
            }

            case 'vacation_days': {
                const days = Number(value);
                if (!Number.isInteger(days) || days < 1 || days > 60) {
                    throw new Error('vacation_days must be between 1 and 60');
                }

                // Virtual start parameter. If Vacation is activated in the same MQTT
                // SET message, preset/vacation handlers read meta.message first.
                vacationDaysCache.set(deviceKey, days);
                state.vacation_days = days;
                break;
            }

            case 'vacation': {
                if (value === 'ON') {
                    const days = Number(
                        meta.message.vacation_days ??
                        meta.state.vacation_days ??
                        vacationDaysCache.get(deviceKey) ??
                        1,
                    );

                    if (!Number.isInteger(days) || days < 1 || days > 60) {
                        throw new Error('vacation_days must be between 1 and 60');
                    }

                    const previousPreset =
                        meta.state.preset &&
                        !['vacation', 'boost'].includes(meta.state.preset)
                            ? meta.state.preset
                            : undefined;

                    await sendVacationStart(entity, days);

                    vacationDaysCache.set(deviceKey, days);
                    state.vacation_days = days;
                    state.vacation_days_active = days;
                    state.vacation = 'ON';
                    state.preset = 'vacation';
                    if (previousPreset) state.preset_before_vacation = previousPreset;
                } else {
                    await tuya.sendDataPointValue(entity, 117, 0);
                    state.vacation_days_active = 0;
                    state.vacation = 'OFF';

                    const restored =
                        meta.state.preset_before_vacation ??
                        derivePreset(
                            presetToMode[meta.state.device_mode] ?? presetToMode[meta.state.preset],
                            meta.state.current_heating_setpoint,
                            meta.state,
                        );

                    if (restored) state.preset = restored;
                }
                break;
            }

            case 'boost_duration': {
                const duration = Number(value);
                if (![30, 60, 90, 120].includes(duration)) {
                    throw new Error('boost_duration must be 30, 60, 90 or 120 minutes');
                }

                boostDurationCache.set(deviceKey, duration);
                state.boost_duration = duration;
                break;
            }

            case 'boost': {
                if (value === 'ON') {
                    const duration = Number(
                        meta.message.boost_duration ??
                        meta.state.boost_duration ??
                        boostDurationCache.get(deviceKey) ??
                        30,
                    );

                    if (![30, 60, 90, 120].includes(duration)) {
                        throw new Error('boost_duration must be 30, 60, 90 or 120 minutes');
                    }

                    await tuya.sendDataPointValue(entity, 118, duration);
                    boostDurationCache.set(deviceKey, duration);

                    state.boost_duration = duration;
                    state.boost_minutes_active = duration;
                    state.boost = 'ON';
                    state.preset = 'boost';
                } else {
                    await tuya.sendDataPointValue(entity, 118, 0);
                    state.boost_minutes_active = 0;
                    state.boost = 'OFF';
                }
                break;
            }

            case 'preset': {
                if (value === 'custom') {
                    throw new Error(
                        "Preset 'custom' is derived; set current_heating_setpoint to a non-preset temperature.",
                    );
                }

                if (value === 'vacation') {
                    const days = Number(
                        meta.message.vacation_days ??
                        meta.state.vacation_days ??
                        vacationDaysCache.get(deviceKey) ??
                        1,
                    );

                    if (!Number.isInteger(days) || days < 1 || days > 60) {
                        throw new Error('vacation_days must be between 1 and 60');
                    }

                    const previousPreset =
                        meta.state.preset &&
                        !['vacation', 'boost'].includes(meta.state.preset)
                            ? meta.state.preset
                            : undefined;

                    await sendVacationStart(entity, days);

                    vacationDaysCache.set(deviceKey, days);
                    state.vacation_days = days;
                    state.vacation_days_active = days;
                    state.vacation = 'ON';
                    state.preset = 'vacation';
                    if (previousPreset) state.preset_before_vacation = previousPreset;
                    break;
                }

                if (value === 'boost') {
                    const duration = Number(
                        meta.message.boost_duration ??
                        meta.state.boost_duration ??
                        boostDurationCache.get(deviceKey) ??
                        30,
                    );

                    if (![30, 60, 90, 120].includes(duration)) {
                        throw new Error('boost_duration must be 30, 60, 90 or 120 minutes');
                    }

                    await tuya.sendDataPointValue(entity, 118, duration);
                    boostDurationCache.set(deviceKey, duration);

                    state.boost_duration = duration;
                    state.boost_minutes_active = duration;
                    state.boost = 'ON';
                    state.preset = 'boost';
                    break;
                }

                if (!(value in presetToMode)) {
                    throw new Error(`Unsupported preset: ${value}`);
                }

                // Cancel temporary modes before selecting a normal device mode.
                if (Number(meta.state.vacation_days_active ?? 0) > 0) {
                    await tuya.sendDataPointValue(entity, 117, 0);
                    state.vacation = 'OFF';
                    state.vacation_days_active = 0;
                }
                if (Number(meta.state.boost_minutes_active ?? 0) > 0) {
                    await tuya.sendDataPointValue(entity, 118, 0);
                    state.boost = 'OFF';
                    state.boost_minutes_active = 0;
                }

                await tuya.sendDataPointEnum(entity, 2, presetToMode[value]);
                state.device_mode = value;
                state.preset = value;
                break;
            }
        }

        return {state};
    },
};

const definition = {
    fingerprint: [
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE284_ltwbm23f',
        },
    ],

    model: 'TRV-705ZB',
    vendor: 'BEOK',
    description: 'Thermostatic radiator valve',

    fromZigbee: [fzBeok],
    toZigbee: [tzBeok],

    configure: async (device, coordinatorEndpoint) => {
        await tuya.configureMagicPacket(device, coordinatorEndpoint);
        await device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
    },


    // Request a datapoint dump whenever the device announces. The current
    // zigbee-herdsman-converters onEvent API passes a single event object.
    // Do not call the removed tuya.onEventSetLocalTime helper.
    onEvent: async (event) => {
        if (event?.type === 'deviceAnnounce' && event.data?.device?.getEndpoint) {
            try {
                await event.data.device.getEndpoint(1).command('manuSpecificTuya', 'dataQuery', {});
            } catch {
                // Best-effort capability query; normal operation must continue.
            }
        }
    },

    exposes: (device) => {
        const list = [
            e.battery(),
            e.child_lock(),

            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-10, 10, 0.1, ea.STATE_SET)
                .withPreset(
                    [
                        'off',
                        'antifrost',
                        'eco',
                        'comfort',
                        'custom',
                        'program',
                        'full_open',
                        'vacation',
                        'boost',
                    ],
                    ea.STATE_SET,
                )
                .withRunningState(['idle', 'heat'], ea.STATE),

            e
                .enum('system_mode', ea.STATE_SET, ['on-off', 'pid'])
                .withDescription('Temperature regulation algorithm'),

            e
                .numeric('switch_hysteresis', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.1),

            e
                .numeric('upper_temperature_limit', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(20)
                .withValueMax(35)
                .withValueStep(0.5),

            e
                .numeric('comfort_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(15.5)
                .withValueMax(35)
                .withValueStep(0.5),

            e
                .numeric('eco_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(5.5)
                .withValueMax(20.5)
                .withValueStep(0.5),

            e
                .numeric('antifrost_temperature', ea.STATE_SET)
                .withUnit('°C')
                .withValueMin(5)
                .withValueMax(14.5)
                .withValueStep(0.5),

            e.binary('window_detection', ea.STATE_SET, 'ON', 'OFF'),
            e.binary('window', ea.STATE, 'OPEN', 'CLOSE'),
            e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF'),

            e.enum('display_brightness', ea.STATE_SET, ['high', 'medium', 'low']),
            e.enum('screen_orientation', ea.STATE_SET, ['up', 'down']),

            e
                .numeric('position', ea.STATE)
                .withUnit('%')
                .withValueMin(0)
                .withValueMax(100),

            ...tuya.exposes.scheduleAllDays(
                ea.STATE_SET,
                'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C',
            ),

            e
                .numeric('vacation_days', ea.STATE_SET)
                .withUnit('d')
                .withValueMin(1)
                .withValueMax(60)
                .withValueStep(1)
                .withDescription('Number of days used when starting Vacation'),

            e.binary('vacation', ea.STATE_SET, 'ON', 'OFF'),

            e
                .numeric('vacation_days_active', ea.STATE)
                .withUnit('d')
                .withDescription('Vacation value reported by the TRV; 0 means inactive'),

            e
                .numeric('boost_duration', ea.STATE_SET)
                .withUnit('min')
                .withValueMin(30)
                .withValueMax(120)
                .withValueStep(30)
                .withPreset('30 min', 30)
                .withPreset('60 min', 60)
                .withPreset('90 min', 90)
                .withPreset('120 min', 120),

            e.binary('boost', ea.STATE_SET, 'ON', 'OFF'),

            e
                .numeric('boost_minutes_active', ea.STATE)
                .withUnit('min')
                .withDescription('Boost value reported by the TRV; 0 means inactive'),

            e
                .enum('reset_all_settings', ea.SET, ['RESET'])
                .withDescription('Reset all TRV settings to the defaults observed in the vendor app')
                .withCategory('config'),
        ];

        // These controls only exist on the enhanced variant. The fingerprint is
        // identical, therefore they are added ONLY after the exact sniff-verified
        // DP125=0x170B marker has been reported by the device.
        if (isEnhancedVariant(device)) {
            list.push(
                e
                    .enum('thrust_mode', ea.STATE_SET, ['auto', 'normal', 'turbo'])
                    .withDescription('Valve motor thrust mode'),
                e
                    .enum('temporary_mode', ea.STATE_SET, ['enabled', 'disabled'])
                    .withDescription('Return a manual temperature override to the schedule at the next scheduled transition'),
                e
                    .enum('critical_low_battery_action', ea.STATE_SET, ['close_valve', 'open_valve_30'])
                    .withDescription('Valve action when the battery reaches the critical-low level'),
                e
                    .binary('enhanced_child_lock', ea.STATE_SET, 'ON', 'OFF')
                    .withDescription('Double-protection child lock'),
                e
                    .enum('valve_calibration', ea.STATE, ['idle', 'running', 'completed'])
                    .withDescription('Automatic valve calibration status'),
            );
        }

        return list;
    },
};

export default definition;
