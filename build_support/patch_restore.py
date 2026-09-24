from pathlib import Path

p = Path("fw/src/telink/Makefile")
s = p.read_text()
needle = "TELINK_SOURCES := \\\n\tmain.c \\\n"
if needle not in s:
    raise SystemExit("Makefile insertion point not found")
s = s.replace(
    needle,
    "TELINK_SOURCES := \\\n\tmain.c \\\n\tstock_restore.c \\\n",
    1,
)
p.write_text(s)

p = Path("fw/src/telink/hal/zigbee_ota.c")
s = p.read_text()
needle = '#include "version_cfg.h"\n'
if needle not in s:
    raise SystemExit("include insertion point not found")
s = s.replace(needle, needle + '#include "stock_restore.h"\n', 1)

old = """        if (status == ZCL_STA_SUCCESS) {
            ota_mcuReboot();
        } else {
"""
new = """        if (status == ZCL_STA_SUCCESS) {
            if (!stock_restore_from_downloaded_image()) {
                ota_mcuReboot();
            }
        } else {
"""
if old not in s:
    raise SystemExit("OTA callback insertion point not found")
s = s.replace(old, new, 1)
p.write_text(s)
