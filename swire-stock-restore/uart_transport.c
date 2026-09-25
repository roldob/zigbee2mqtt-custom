/*
 * UART compatibility transport for the Blue Pill TLSR SWire bridge.
 *
 * Keeps the original usb.h byte-stream API so the upstream command parser
 * remains unchanged, but carries the protocol over USART1:
 *   PA9  = TX
 *   PA10 = RX
 *   115200 8N1
 */
#include "stm32f103.h"
#include "usb.h"

#define USART1_BASE 0x40013800u
#define USART_SR    REG32(USART1_BASE + 0x00)
#define USART_DR    REG32(USART1_BASE + 0x04)
#define USART_BRR   REG32(USART1_BASE + 0x08)
#define USART_CR1   REG32(USART1_BASE + 0x0C)

#define RCC_APB2ENR_USART1EN (1u << 14)

#define USART_SR_RXNE (1u << 5)
#define USART_SR_TXE  (1u << 7)
#define USART_CR1_RE  (1u << 2)
#define USART_CR1_TE  (1u << 3)
#define USART_CR1_UE  (1u << 13)

void USB_LP_CAN1_RX0_IRQHandler(void)
{
    /* Unused in the UART build; kept only to satisfy the upstream vector table. */
}

void usb_init(void)
{
    RCC_APB2ENR |= RCC_APB2ENR_IOPAEN | RCC_APB2ENR_AFIOEN | RCC_APB2ENR_USART1EN;

    gpio_cfg(GPIOA_BASE, 9, GPIO_AF_PP_50);  /* USART1 TX */
    gpio_cfg(GPIOA_BASE, 10, GPIO_IN_FLOAT); /* USART1 RX */

    USART_CR1 = 0;
    /* PCLK2 = 72 MHz.  USARTDIV = 72e6/(16*115200) = 39.0625,
     * BRR = mantissa 39, fraction 1 => 0x0271. */
    USART_BRR = 0x0271u;
    USART_CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}

int usb_configured(void)
{
    return 1;
}

int usb_getc_nb(void)
{
    if (!(USART_SR & USART_SR_RXNE))
        return -1;
    return (int)(USART_DR & 0xffu);
}

uint8_t usb_getc(void)
{
    int c;
    while ((c = usb_getc_nb()) < 0) {}
    return (uint8_t)c;
}

void usb_write(const uint8_t *data, uint32_t len)
{
    while (len--) {
        while (!(USART_SR & USART_SR_TXE)) {}
        USART_DR = *data++;
    }
}
