#ifndef BSEED_STOCK_RESTORE_H
#define BSEED_STOCK_RESTORE_H

/*
 * Returns 0 when no BSEEDSTOCKR2 image is present.
 * Returns -1 when an R2 image is present but fails validation.
 * On success the function restores stock flash and resets; it does not return.
 */
int stock_restore_try(void);

#endif
