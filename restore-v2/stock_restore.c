#include "hal/stock_restore.h"
#include "ota_reformating/ram_code_flash.h"

#pragma pack(push, 1)
#include "chip_8258/flash.h"
#include "tl_common.h"
#pragma pack(pop)

#define SLOT0_ADDR              0x00000u
#define SLOT1_ADDR              0x40000u
#define TELINK_FLAG_OFFSET      0x00008u
#define TELINK_SIZE_OFFSET      0x00018u
#define RESTORE_HDR_OFFSET      0x00020u
#define RESTORE_META_OFFSET     0x00030u
#define RESTORE_TABLE_OFFSET    0x00048u
#define MAX_OTA_IMAGE_SIZE      0x34000u

#define EXPECTED_BOOT_LEN       0x00006A0Cu
#define EXPECTED_APP_LEN        0x00039464u
#define EXPECTED_RAW_LEN        0x0003FE70u
#define EXPECTED_RAW_CRC32      0x60FAF8A7u
#define EXPECTED_CHUNK_SIZE     0x00002000u
#define EXPECTED_CHUNK_COUNT    32u

#define APP_DEST_ADDR           0x00008000u
#define PRESERVE_FROM_ADDR      0x00041464u
#define FINAL_SECTOR_ADDR       0x00041000u
#define FINAL_SECTOR_END        0x00042000u
#define SECTOR_SIZE             0x1000u
#define PAGE_SIZE_BYTES         256u
#define MAX_SECTORS             (FINAL_SECTOR_END / SECTOR_SIZE)
#define MAX_COMP_CHUNK          8192u

static const unsigned char restore_marker[16] = {
    'B','S','E','E','D','S','T','O','C','K','R','2',0,0,0,0
};

static unsigned char comp_buf[MAX_COMP_CHUNK];
static unsigned char out_buf[EXPECTED_CHUNK_SIZE];
static unsigned char verify_buf[PAGE_SIZE_BYTES];
static unsigned char preserve_tail[FINAL_SECTOR_END - PRESERVE_FROM_ADDR];
static unsigned short chunk_len[EXPECTED_CHUNK_COUNT];
static unsigned char erased_sector[MAX_SECTORS];

static unsigned int _attribute_ram_code_sec_ rd_u32(const unsigned char *p) {
    return ((unsigned int)p[0]) |
           ((unsigned int)p[1] << 8) |
           ((unsigned int)p[2] << 16) |
           ((unsigned int)p[3] << 24);
}

static unsigned short _attribute_ram_code_sec_ rd_u16(const unsigned char *p) {
    return (unsigned short)(((unsigned short)p[0]) |
                            ((unsigned short)p[1] << 8));
}

static int _attribute_ram_code_sec_ bytes_equal(const unsigned char *a,
                                                 const unsigned char *b,
                                                 unsigned int n) {
    while (n--) {
        if (*a++ != *b++) return 0;
    }
    return 1;
}

static unsigned int _attribute_ram_code_sec_ crc32_update(unsigned int crc,
                                                           const unsigned char *p,
                                                           unsigned int n) {
    while (n--) {
        unsigned int x = (crc ^ *p++) & 0xffu;
        unsigned int i;
        for (i = 0; i < 8; i++) {
            x = (x >> 1) ^ ((x & 1u) ? 0xEDB88320u : 0u);
        }
        crc = (crc >> 8) ^ x;
    }
    return crc;
}

static int _attribute_ram_code_sec_ lz4_decode(const unsigned char *src,
                                                unsigned int src_len,
                                                unsigned char *dst,
                                                unsigned int dst_len) {
    const unsigned char *ip = src;
    const unsigned char *iend = src + src_len;
    unsigned char *op = dst;
    unsigned char *oend = dst + dst_len;

    while (ip < iend) {
        unsigned int token = *ip++;
        unsigned int lit_len = token >> 4;
        unsigned int match_len;
        unsigned int offset;
        unsigned int i;

        if (lit_len == 15u) {
            unsigned int s;
            do {
                if (ip >= iend) return -1;
                s = *ip++;
                lit_len += s;
            } while (s == 255u);
        }

        if ((unsigned int)(iend - ip) < lit_len) return -2;
        if ((unsigned int)(oend - op) < lit_len) return -3;
        for (i = 0; i < lit_len; i++) *op++ = *ip++;

        if (ip == iend) break;
        if ((unsigned int)(iend - ip) < 2u) return -4;

        offset = (unsigned int)ip[0] | ((unsigned int)ip[1] << 8);
        ip += 2;
        if (offset == 0u || offset > (unsigned int)(op - dst)) return -5;

        match_len = token & 0x0fu;
        if (match_len == 15u) {
            unsigned int s;
            do {
                if (ip >= iend) return -6;
                s = *ip++;
                match_len += s;
            } while (s == 255u);
        }
        match_len += 4u;
        if ((unsigned int)(oend - op) < match_len) return -7;

        {
            unsigned char *m = op - offset;
            for (i = 0; i < match_len; i++) *op++ = *m++;
        }
    }

    return (op == oend) ? 0 : -8;
}

static int _attribute_ram_code_sec_ read_marker(unsigned int slot) {
    unsigned char tmp[16];
    ram_code_flash_read_page(slot + RESTORE_HDR_OFFSET, 16, tmp);
    return bytes_equal(tmp, restore_marker, 16);
}

static unsigned int _attribute_ram_code_sec_ find_restore_slot(void) {
    if (read_marker(SLOT0_ADDR)) return SLOT0_ADDR;
    if (read_marker(SLOT1_ADDR)) return SLOT1_ADDR;
    return 0xffffffffu;
}

static void _attribute_ram_code_sec_ invalidate_slot(unsigned int slot) {
    unsigned int zero = 0;
    ram_code_flash_write_page(slot + TELINK_FLAG_OFFSET, 4, (unsigned char *)&zero);
}

static int _attribute_ram_code_sec_ load_and_validate_header(unsigned int slot,
                                                              unsigned int *data_off) {
    unsigned char meta[24];
    unsigned char table[EXPECTED_CHUNK_COUNT * 2];
    unsigned int image_size = 0;
    unsigned int i;
    unsigned int sum = 0;

    ram_code_flash_read_page(slot + TELINK_SIZE_OFFSET, 4, (unsigned char *)&image_size);
    if (image_size == 0u || image_size > MAX_OTA_IMAGE_SIZE) return -1;

    ram_code_flash_read_page(slot + RESTORE_META_OFFSET, sizeof(meta), meta);
    if (rd_u32(meta + 0)  != EXPECTED_BOOT_LEN) return -2;
    if (rd_u32(meta + 4)  != EXPECTED_APP_LEN) return -3;
    if (rd_u32(meta + 8)  != EXPECTED_RAW_LEN) return -4;
    if (rd_u32(meta + 12) != EXPECTED_RAW_CRC32) return -5;
    if (rd_u32(meta + 16) != EXPECTED_CHUNK_SIZE) return -6;
    if (rd_u32(meta + 20) != EXPECTED_CHUNK_COUNT) return -7;

    ram_code_flash_read_page(slot + RESTORE_TABLE_OFFSET, sizeof(table), table);
    for (i = 0; i < EXPECTED_CHUNK_COUNT; i++) {
        unsigned int n = rd_u16(table + i * 2u);
        if (n == 0u || n > MAX_COMP_CHUNK) return -8;
        chunk_len[i] = (unsigned short)n;
        sum += n;
    }

    *data_off = RESTORE_TABLE_OFFSET + sizeof(table);
    if (*data_off + sum > image_size - 4u) return -9;
    return 0;
}

static unsigned int _attribute_ram_code_sec_ chunk_source_offset(unsigned int index,
                                                                  unsigned int data_off) {
    unsigned int i;
    unsigned int off = data_off;
    for (i = 0; i < index; i++) off += chunk_len[i];
    return off;
}

static int _attribute_ram_code_sec_ validate_payload(unsigned int slot,
                                                      unsigned int data_off) {
    unsigned int crc = 0xffffffffu;
    unsigned int raw_off = 0;
    unsigned int src_off = data_off;
    unsigned int i;

    for (i = 0; i < EXPECTED_CHUNK_COUNT; i++) {
        unsigned int out_len = EXPECTED_RAW_LEN - raw_off;
        int rc;
        if (out_len > EXPECTED_CHUNK_SIZE) out_len = EXPECTED_CHUNK_SIZE;

        ram_code_flash_read_page(slot + src_off, chunk_len[i], comp_buf);
        rc = lz4_decode(comp_buf, chunk_len[i], out_buf, out_len);
        if (rc != 0) return -1;
        crc = crc32_update(crc, out_buf, out_len);
        raw_off += out_len;
        src_off += chunk_len[i];
    }

    crc ^= 0xffffffffu;
    if (raw_off != EXPECTED_RAW_LEN) return -2;
    if (crc != EXPECTED_RAW_CRC32) return -3;
    return 0;
}

static void _attribute_ram_code_sec_ clear_erase_map(void) {
    unsigned int i;
    for (i = 0; i < MAX_SECTORS; i++) erased_sector[i] = 0;
}

static int _attribute_ram_code_sec_ verify_flash(unsigned int addr,
                                                  const unsigned char *src,
                                                  unsigned int len) {
    while (len) {
        unsigned int n = len > PAGE_SIZE_BYTES ? PAGE_SIZE_BYTES : len;
        unsigned int i;
        ram_code_flash_read_page(addr, n, verify_buf);
        for (i = 0; i < n; i++) if (verify_buf[i] != src[i]) return -1;
        addr += n;
        src += n;
        len -= n;
    }
    return 0;
}

static int _attribute_ram_code_sec_ prepare_sector(unsigned int sector) {
    unsigned int idx = sector / SECTOR_SIZE;
    if (idx >= MAX_SECTORS) return -1;
    if (erased_sector[idx]) return 0;

    if (sector == FINAL_SECTOR_ADDR) {
        unsigned int tail_len = FINAL_SECTOR_END - PRESERVE_FROM_ADDR;
        ram_code_flash_read_page(PRESERVE_FROM_ADDR, tail_len, preserve_tail);
        ram_code_flash_erase_sector(sector);
        ram_code_flash_write_page(PRESERVE_FROM_ADDR, tail_len, preserve_tail);
        if (verify_flash(PRESERVE_FROM_ADDR, preserve_tail, tail_len) != 0) return -2;
    } else {
        ram_code_flash_erase_sector(sector);
    }

    erased_sector[idx] = 1;
    return 0;
}

static int _attribute_ram_code_sec_ write_flash_bytes(unsigned int addr,
                                                       const unsigned char *src,
                                                       unsigned int len) {
    while (len) {
        unsigned int sector = addr & ~(SECTOR_SIZE - 1u);
        unsigned int page_room = PAGE_SIZE_BYTES - (addr & (PAGE_SIZE_BYTES - 1u));
        unsigned int sector_room = SECTOR_SIZE - (addr & (SECTOR_SIZE - 1u));
        unsigned int n = len;
        if (n > page_room) n = page_room;
        if (n > sector_room) n = sector_room;

        if (prepare_sector(sector) != 0) return -1;
        ram_code_flash_write_page(addr, n, (unsigned char *)src);
        if (verify_flash(addr, src, n) != 0) return -2;

        addr += n;
        src += n;
        len -= n;
    }
    return 0;
}

static int _attribute_ram_code_sec_ write_raw_chunk(unsigned int raw_off,
                                                     const unsigned char *src,
                                                     unsigned int len) {
    while (len) {
        unsigned int dest;
        unsigned int n;

        if (raw_off < EXPECTED_BOOT_LEN) {
            n = EXPECTED_BOOT_LEN - raw_off;
            if (n > len) n = len;
            dest = raw_off;
        } else {
            unsigned int app_off = raw_off - EXPECTED_BOOT_LEN;
            n = len;
            dest = APP_DEST_ADDR + app_off;
            if (dest + n > PRESERVE_FROM_ADDR) n = PRESERVE_FROM_ADDR - dest;
        }

        if (n == 0u) return -1;
        if (write_flash_bytes(dest, src, n) != 0) return -2;
        raw_off += n;
        src += n;
        len -= n;
    }
    return 0;
}

static int _attribute_ram_code_sec_ restore_payload(unsigned int slot,
                                                     unsigned int data_off) {
    int index;
    int step;
    int end;

    clear_erase_map();
    ram_code_flash_write_status(FLASH_TYPE_8BIT_STATUS, 0);

    if (slot == SLOT0_ADDR) {
        index = (int)EXPECTED_CHUNK_COUNT - 1;
        step = -1;
        end = -1;
    } else {
        index = 0;
        step = 1;
        end = (int)EXPECTED_CHUNK_COUNT;
    }

    for (; index != end; index += step) {
        unsigned int raw_off = (unsigned int)index * EXPECTED_CHUNK_SIZE;
        unsigned int out_len = EXPECTED_RAW_LEN - raw_off;
        unsigned int src_off = chunk_source_offset((unsigned int)index, data_off);
        int rc;

        if (out_len > EXPECTED_CHUNK_SIZE) out_len = EXPECTED_CHUNK_SIZE;
        ram_code_flash_read_page(slot + src_off, chunk_len[index], comp_buf);
        rc = lz4_decode(comp_buf, chunk_len[index], out_buf, out_len);
        if (rc != 0) return -1;
        if (write_raw_chunk(raw_off, out_buf, out_len) != 0) return -2;
    }

    return 0;
}

int _attribute_ram_code_sec_ stock_restore_try(void) {
    unsigned int slot = find_restore_slot();
    unsigned int data_off = 0;

    if (slot == 0xffffffffu) return 0;

    if (load_and_validate_header(slot, &data_off) != 0 ||
        validate_payload(slot, data_off) != 0) {
        ram_code_flash_write_status(FLASH_TYPE_8BIT_STATUS, 0);
        invalidate_slot(slot);
        return -1;
    }

    if (restore_payload(slot, data_off) != 0) {
        SYSTEM_RESET();
    }

    SYSTEM_RESET();
    return 1;
}
