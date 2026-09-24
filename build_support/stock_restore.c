#include "stock_restore.h"

#pragma pack(push, 1)
#include "tl_common.h"
#include "zcl_include.h"
#include "ota.h"
#include "chip_8258/flash.h"
#include "chip_8258/watchdog.h"
#pragma pack(pop)

#include "ota_reformating/ensure_ota_scheme.h"
#include "ota_reformating/ram_code_flash.h"

#define STOCK_BOOT_SIZE          0x00006A0Cu
#define STOCK_APP_DST            0x00008000u
#define STOCK_APP_SIZE           0x00039464u
#define STOCK_APP_CRC            0x3A38C262u
#define STOCK_APP_MAGIC16        0x025Du
#define STOCK_APP_START_FLAG     0x544C4E4Bu

#define TRANSPORT_HEADER_SIZE    0x40u
#define TRANSPORT_BOOT_OFFSET    TRANSPORT_HEADER_SIZE
#define TRANSPORT_APP_OFFSET     (TRANSPORT_BOOT_OFFSET + STOCK_BOOT_SIZE)
#define TRANSPORT_TOTAL_SIZE     0x0003FEB4u
#define TRANSPORT_VERSION        1u

#define STOCK_PRIVATE_DATA_START 0x000D8000u
#define BOOT_STAGE_ADDR          0x000C0000u
#define FLASH_SECTOR             0x1000u
#define COPY_CHUNK               256u

static const u8 transport_marker[16] = {
    'B','S','E','E','D','S','T','O','C','K','R','1',0,0,0,0
};

static int _attribute_ram_code_sec_ rcmp(const u8 *a, const u8 *b, u32 n) {
    while (n--) {
        if (*a++ != *b++) return 1;
    }
    return 0;
}

static void _attribute_ram_code_sec_ fail_hard(void) {
    wd_stop();
    irq_disable();
    while (1) {}
}

static void _attribute_ram_code_sec_ copy_app_chunk(u32 src, u32 dst, u32 n, u32 app_off) {
    u8 b[COPY_CHUNK], v[COPY_CHUNK];
    u32 i;

    ram_code_flash_read_page(src, n, b);

    for (i = 0; i < 4; ++i) {
        u32 f = FLASH_TLNK_FLAG_OFFSET + i;
        if (app_off <= f && app_off + n > f)
            b[f - app_off] = (u8)(STOCK_APP_START_FLAG >> (8u * i));
    }

    ram_code_flash_write_page(dst, n, b);
    ram_code_flash_read_page(dst, n, v);
    if (rcmp(b, v, n)) fail_hard();
}

static void _attribute_ram_code_sec_ copy_boot_chunk(u32 src, u32 dst, u32 n) {
    u8 b[COPY_CHUNK], v[COPY_CHUNK];

    ram_code_flash_read_page(src, n, b);
    ram_code_flash_write_page(dst, n, b);
    ram_code_flash_read_page(dst, n, v);
    if (rcmp(b, v, n)) fail_hard();
}

static void _attribute_ram_code_sec_ restore_ram(u32 app_src) {
    u32 off, pos, n, sector_len;

    irq_disable();
    wd_stop();
    ram_code_flash_write_status(FLASH_TYPE_8BIT_STATUS, 0);

    if (app_src < STOCK_APP_DST && app_src + STOCK_APP_SIZE > STOCK_APP_DST) {
        s32 si = (s32)((STOCK_APP_SIZE - 1u) >> 12);
        for (; si >= 0; --si) {
            off = ((u32)si) << 12;
            ram_code_flash_erase_sector(STOCK_APP_DST + off);

            sector_len = STOCK_APP_SIZE - off;
            if (sector_len > FLASH_SECTOR) sector_len = FLASH_SECTOR;

            for (pos = 0; pos < sector_len; pos += COPY_CHUNK) {
                n = sector_len - pos;
                if (n > COPY_CHUNK) n = COPY_CHUNK;
                copy_app_chunk(app_src + off + pos,
                               STOCK_APP_DST + off + pos, n, off + pos);
            }
        }
    } else {
        for (off = 0; off < STOCK_APP_SIZE; off += FLASH_SECTOR) {
            ram_code_flash_erase_sector(STOCK_APP_DST + off);

            sector_len = STOCK_APP_SIZE - off;
            if (sector_len > FLASH_SECTOR) sector_len = FLASH_SECTOR;

            for (pos = 0; pos < sector_len; pos += COPY_CHUNK) {
                n = sector_len - pos;
                if (n > COPY_CHUNK) n = COPY_CHUNK;
                copy_app_chunk(app_src + off + pos,
                               STOCK_APP_DST + off + pos, n, off + pos);
            }
        }
    }

    for (off = 0; off < STOCK_APP_DST; off += FLASH_SECTOR)
        ram_code_flash_erase_sector(off);

    for (off = 0; off < STOCK_BOOT_SIZE; off += COPY_CHUNK) {
        n = STOCK_BOOT_SIZE - off;
        if (n > COPY_CHUNK) n = COPY_CHUNK;
        copy_boot_chunk(BOOT_STAGE_ADDR + off, off, n);
    }

    for (off = 0x00042000u; off < STOCK_PRIVATE_DATA_START; off += FLASH_SECTOR)
        ram_code_flash_erase_sector(off);

    WRITE_REG8(0x602, 0x88);
    while (1) {}
}

static bool marker_ok(u32 src) {
    u8 b[16];
    u32 i;
    ram_code_flash_read_page(src + 0x20u, sizeof(b), b);
    for (i = 0; i < sizeof(b); ++i)
        if (b[i] != transport_marker[i]) return false;
    return true;
}

static bool stage_boot(u32 src) {
    u32 off, n;
    u8 b[COPY_CHUNK], v[COPY_CHUNK];

    ram_code_flash_write_status(FLASH_TYPE_8BIT_STATUS, 0);

    for (off = BOOT_STAGE_ADDR;
         off < BOOT_STAGE_ADDR + STOCK_BOOT_SIZE;
         off += FLASH_SECTOR)
        ram_code_flash_erase_sector(off);

    for (off = 0; off < STOCK_BOOT_SIZE; off += COPY_CHUNK) {
        n = STOCK_BOOT_SIZE - off;
        if (n > COPY_CHUNK) n = COPY_CHUNK;

        ram_code_flash_read_page(src + TRANSPORT_BOOT_OFFSET + off, n, b);
        ram_code_flash_write_page(BOOT_STAGE_ADDR + off, n, b);
        ram_code_flash_read_page(BOOT_STAGE_ADDR + off, n, v);
        if (rcmp(b, v, n)) return false;
    }

    return true;
}

static void invalidate_image(u32 src) {
    u8 zero = 0;
    ram_code_flash_write_status(FLASH_TYPE_8BIT_STATUS, 0);
    ram_code_flash_write_page(src + FLASH_TLNK_FLAG_OFFSET, 1, &zero);
}

bool stock_restore_from_downloaded_image(void) {
    u32 active = mcuBootAddrGet();
    u32 src, size = 0, boot_size = 0, app_size = 0;
    u32 app_crc_meta = 0, version = 0, app_crc = 0;
    u32 app_flag = 0, app_src;
    u16 app_magic = 0;

    if (active == 0)
        src = FLASH_ADDR_OF_OTA_IMAGE;
    else if (active == FLASH_ADDR_OF_OTA_IMAGE)
        src = 0;
    else
        return false;

    /* Normal custom-firmware OTAs must remain fully usable as a rollback path.
     * Only intercept images carrying our private BSEED stock-restore marker.
     * Anything else is left untouched and the caller performs the normal
     * ota_mcuReboot() flow. */
    if (!marker_ok(src))
        return false;

    if (!ota_newImageValid(src)) {
        invalidate_image(src);
        return false;
    }

    ram_code_flash_read_page(src + 0x18u, 4, (u8 *)&size);
    ram_code_flash_read_page(src + 0x30u, 4, (u8 *)&boot_size);
    ram_code_flash_read_page(src + 0x34u, 4, (u8 *)&app_size);
    ram_code_flash_read_page(src + 0x38u, 4, (u8 *)&app_crc_meta);
    ram_code_flash_read_page(src + 0x3Cu, 4, (u8 *)&version);

    if (size != TRANSPORT_TOTAL_SIZE ||
        boot_size != STOCK_BOOT_SIZE || app_size != STOCK_APP_SIZE ||
        app_crc_meta != STOCK_APP_CRC || version != TRANSPORT_VERSION) {
        invalidate_image(src);
        return false;
    }

    app_src = src + TRANSPORT_APP_OFFSET;
    ram_code_flash_read_page(app_src + 6u, 2, (u8 *)&app_magic);
    ram_code_flash_read_page(app_src + 8u, 4, (u8 *)&app_flag);
    ram_code_flash_read_page(app_src + STOCK_APP_SIZE - 4u, 4, (u8 *)&app_crc);

    if (app_magic != STOCK_APP_MAGIC16 ||
        (app_flag & 0xFFFFFF00u) != (STOCK_APP_START_FLAG & 0xFFFFFF00u) ||
        app_crc != STOCK_APP_CRC) {
        invalidate_image(src);
        return false;
    }

    if (!stage_boot(src)) {
        invalidate_image(src);
        return false;
    }

    restore_ram(app_src);
    return true;
}
