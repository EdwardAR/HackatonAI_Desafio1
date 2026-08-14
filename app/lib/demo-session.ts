export const DEMO_SESSION_KEY = "claria_demo_session";
export const DEMO_SESSION_VALUE = "active";
export const DEMO_OTP = "123456";

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return (digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits).slice(0, 9);
}

export function isValidPeruvianMobile(value: string): boolean {
  return /^9\d{8}$/.test(normalizePhone(value));
}

export function maskPhone(value: string): string {
  const normalized = normalizePhone(value);
  return normalized.length === 9 ? `*** *** ${normalized.slice(-3)}` : "*** *** ***";
}

export function isValidDemoOtp(value: string): boolean {
  return value.replace(/\D/g, "") === DEMO_OTP;
}

export function createDemoSession(storage: SessionStorageLike): void {
  storage.setItem(DEMO_SESSION_KEY, DEMO_SESSION_VALUE);
}

export function hasDemoSession(storage: SessionStorageLike): boolean {
  return storage.getItem(DEMO_SESSION_KEY) === DEMO_SESSION_VALUE;
}

export function clearDemoSession(storage: SessionStorageLike): void {
  storage.removeItem(DEMO_SESSION_KEY);
}
