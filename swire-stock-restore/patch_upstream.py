from pathlib import Path

p = Path("upstream/blue-pill-firmware/swire.c")
s = p.read_text()

start = s.index("#define PB0_BIT")
end = s.index("int sw_selftest", start)

reset_block = r'''#define PB12_BIT  (1u << 12)

/*
 * RESET-based target control for the user's proven wiring:
 *   PB12 -> TLSR8258 RST, active low
 *   target is powered continuously from an external regulated 3.3 V source
 *   PB0 is not connected
 *
 * The host protocol still sees a logical power state.  "Power off" means
 * hold the target in reset; "power on" means release reset.  This preserves
 * compatibility with the unmodified upstream programmer_cli.exe.
 */
static void target_reset_assert(void)
{
    GPIO_BRR(GPIOB_BASE) = PB12_BIT;
    gpio_cfg(GPIOB_BASE, 12, GPIO_OUT_PP_50);
}

static void target_reset_release(void)
{
    GPIO_BSRR(GPIOB_BASE) = PB12_BIT;
    gpio_cfg(GPIOB_BASE, 12, GPIO_OUT_PP_50);
}

void sw_power_mask(int on, uint8_t rails)
{
    (void)rails;

    if (on) {
        gpio_cfg(GPIOA_BASE, 7, GPIO_AF_PP_50);
        spi_park_high();
        target_reset_release();
        pwr_rails = PWR_RAIL_BOTH;
        delay_ms(2);
    } else {
        /* The target remains electrically powered; holding reset low prevents
         * its firmware from touching MSPI/SWire while the bridge is idle. */
        gpio_cfg(GPIOA_BASE, 7, GPIO_AF_OD_50);
        target_reset_assert();
        pwr_rails = 0;
    }
}

void sw_power(int on)
{
    sw_power_mask(on, PWR_RAIL_BOTH);
}

int sw_powered(void)
{
    return pwr_rails != 0;
}

uint8_t sw_power_rails(void)
{
    return pwr_rails;
}

uint16_t sw_activate(uint16_t count, uint32_t addr, uint8_t data)
{
    uint16_t i;

    /* PB12 reset is the working replacement for the upstream power-cycle.
     * Prepare the SWire line before releasing reset, then start activation
     * frames immediately inside the post-reset acceptance window. */
    target_reset_assert();
    pwr_rails = 0;
    gpio_cfg(GPIOA_BASE, 7, GPIO_AF_PP_50);
    spi_park_high();
    delay_ms(80);
    target_reset_release();
    pwr_rails = PWR_RAIL_BOTH;

    for (i = 0; i < count; i++)
        sw_write(addr, &data, 1);
    return i;
}

uint16_t sw_activate_read(uint16_t count, uint32_t wr_addr, uint8_t wr_data,
                          uint32_t rd_addr, uint32_t rd_len,
                          uint8_t *out, uint8_t *echo)
{
    uint16_t i;

    target_reset_assert();
    pwr_rails = 0;
    gpio_cfg(GPIOA_BASE, 7, GPIO_AF_PP_50);
    spi_park_high();
    delay_ms(80);
    target_reset_release();
    pwr_rails = PWR_RAIL_BOTH;

    for (i = 0; i < count; i++) {
        sw_write(wr_addr, &wr_data, 1);
        if ((i & 0x1F) == 0x1F) {
            if (read_frame(rd_addr, rd_len, rd_len, out, echo) == 0
                && echo[0] == 0x5A)
                return i;
        }
    }
    return 0xFFFF;
}

'''

s = s[:start] + reset_block + s[end:]

init_start = s.rfind("void sw_init(void)")
if init_start < 0:
    raise SystemExit("sw_init not found")

new_init = r'''void sw_init(void)
{
    RCC_APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_IOPBEN;

    /* PB12 is TLSR RST, active low.  Preload ODR high before changing the pin
     * to output mode so startup cannot create an unintended reset pulse. */
    GPIO_BSRR(GPIOB_BASE) = PB12_BIT;
    gpio_cfg(GPIOB_BASE, 12, GPIO_OUT_PP_50);
    pwr_rails = PWR_RAIL_BOTH;

    /* PA5 is the internal SPI clock output (not connected to target).
     * PA6 senses SWS. PA7 drives SWS through the existing 750 ohm resistor. */
    gpio_cfg(GPIOA_BASE, 5, GPIO_AF_PP_50);
    gpio_cfg(GPIOA_BASE, 6, GPIO_IN_FLOAT);
    gpio_cfg(GPIOA_BASE, 7, GPIO_AF_PP_50);

    spi_setup();
    spi_park_high();
}
'''

s = s[:init_start] + new_init
p.write_text(s)

# Replace USB CDC implementation with a USART1 115200 compatibility shim.
uart = Path("swire-stock-restore/uart_transport.c").read_text()
Path("upstream/blue-pill-firmware/usb.c").write_text(uart)

# Stamp an unmistakable bridge identity/version while keeping the TLSRSWS
# prefix accepted by the upstream host protocol.
ph = Path("upstream/blue-pill-firmware/protocol.h")
h = ph.read_text()
h = h.replace('#define FW_VERSION       0x0002', '#define FW_VERSION       0x0003')
h = h.replace('#define FW_IDENT         "TLSRSWS2"', '#define FW_IDENT         "TLSRSWS3"')
ph.write_text(h)

print("UART+RESET+FLASH bridge patch applied")
