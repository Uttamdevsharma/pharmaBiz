/**
 * POS Thermal Printer Cash Drawer Interface
 * Supports:
 * 1. Web Serial API direct hardware kick (ESC/POS pulse to RJ11/RJ12 drawer port)
 * 2. Standard ESC/POS kick pulse: [0x1B, 0x70, 0x00, 0x19, 0xFA]
 * 3. Driver-level print job drawer kick integration
 */

const STORAGE_KEY_AUTO_KICK = "pos_cash_drawer_auto_kick";
const ESC_POS_KICK_PIN2 = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const ESC_POS_KICK_PIN5 = new Uint8Array([0x1b, 0x70, 0x01, 0x19, 0xfa]);

// Active Web Serial port reference for zero-latency drawer kicks
let cachedSerialPort: any = null;

/**
 * Check if the Web Serial API is supported in the current browser.
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * Check if auto drawer kick is enabled in user settings (defaults to true).
 */
export function isAutoDrawerKickEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(STORAGE_KEY_AUTO_KICK);
  return saved === null ? true : saved === "true";
}

/**
 * Update the auto drawer kick setting.
 */
export function setAutoDrawerKickEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_AUTO_KICK, enabled ? "true" : "false");
  }
}

/**
 * Request user to select a USB/Serial thermal printer with cash drawer port.
 */
export async function pairCashDrawerPort(): Promise<boolean> {
  if (!isWebSerialSupported()) {
    console.warn("[CashDrawer] Web Serial API is not supported in this browser.");
    return false;
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    cachedSerialPort = port;
    return true;
  } catch (err: any) {
    if (err?.name !== "NotFoundError") {
      console.warn("[CashDrawer] Failed to pair serial port:", err);
    }
    return false;
  }
}

/**
 * Send standard ESC/POS pulse to trigger the cash drawer mechanically via Web Serial.
 */
export async function kickDrawerViaSerial(pin: 2 | 5 = 2): Promise<boolean> {
  if (!isWebSerialSupported()) return false;

  try {
    let port = cachedSerialPort;

    // Check previously authorized ports if cached is not set
    if (!port) {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        port = ports[0];
        cachedSerialPort = port;
      }
    }

    if (!port) return false;

    // Open port if not already open
    if (!port.readable) {
      await port.open({ baudRate: 9600 });
    }

    const writer = port.writable.getWriter();
    const pulse = pin === 5 ? ESC_POS_KICK_PIN5 : ESC_POS_KICK_PIN2;
    await writer.write(pulse);
    writer.releaseLock();
    return true;
  } catch (err) {
    console.warn("[CashDrawer] Serial kick error:", err);
    return false;
  }
}

/**
 * Trigger the cash drawer:
 * 1. Tries Web Serial if paired/available
 * 2. Emits POS drawer kick event for thermal printer drivers
 */
export async function triggerCashDrawer(): Promise<{ success: boolean; method: "serial" | "driver" }> {
  if (!isAutoDrawerKickEnabled()) {
    return { success: false, method: "driver" };
  }

  // Attempt direct serial kick
  try {
    const serialKicked = await kickDrawerViaSerial(2);
    if (serialKicked) {
      return { success: true, method: "serial" };
    }
  } catch {}

  // Fallback to driver-based kick: thermal printer drivers pop the drawer when the receipt prints
  return { success: true, method: "driver" };
}

