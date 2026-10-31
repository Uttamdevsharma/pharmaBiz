import { prisma } from "./prisma";
import { decryptSecret } from "./payment-security";

export interface BkashConfig {
  enabled: boolean;
  isLive: boolean;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  baseUrl: string;
}

export async function getBkashConfig(): Promise<BkashConfig> {
  const settings = await (prisma as any).platform_settings.findFirst({
    orderBy: { id: "asc" },
  });

  const isLive = Boolean(settings?.bkash_is_live);
  const enabled = Boolean(settings?.bkash_merchant_enabled);
  const appKey = settings?.bkash_app_key || "";
  const appSecret = decryptSecret(settings?.bkash_app_secret || "");
  const username = settings?.bkash_username || "";
  const password = decryptSecret(settings?.bkash_password || "");
  const baseUrl = isLive
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout";

  return { enabled, isLive, appKey, appSecret, username, password, baseUrl };
}

// 1. Grant Token
export async function getBkashIdToken(): Promise<string> {
  const config = await getBkashConfig();
  if (!config.appKey || !config.appSecret || !config.username || !config.password) {
    throw new Error("bKash Merchant credentials are not properly configured in Admin Settings.");
  }

  const res = await fetch(`${config.baseUrl}/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
    }),
  });

  const data: any = await res.json();
  if (!res.ok || !data.id_token) {
    throw new Error(data.statusMessage || data.message || "Failed to obtain bKash id_token.");
  }

  return data.id_token;
}

// 2. Create Payment (Returns bkashURL for official checkout redirect)
export async function createBkashPayment(params: {
  amount: number;
  invoiceNumber: string;
  callbackURL: string;
  payerReference?: string;
}) {
  const config = await getBkashConfig();
  if (!config.enabled) {
    throw new Error("bKash Merchant checkout is currently disabled by Super Admin.");
  }

  const idToken = await getBkashIdToken();
  const res = await fetch(`${config.baseUrl}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: idToken,
      "X-APP-Key": config.appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: params.payerReference || "PharmacySys",
      callbackURL: params.callbackURL,
      amount: params.amount.toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: params.invoiceNumber,
    }),
  });

  const data: any = await res.json();
  return { ...data, idToken };
}

// 3. Execute Payment
export async function executeBkashPayment(paymentID: string, idToken?: string) {
  const config = await getBkashConfig();
  const token = idToken || (await getBkashIdToken());

  const res = await fetch(`${config.baseUrl}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": config.appKey,
    },
    body: JSON.stringify({ paymentID }),
  });

  return await res.json();
}

// 4. Query Payment Status
export async function queryBkashPayment(paymentID: string, idToken?: string) {
  const config = await getBkashConfig();
  const token = idToken || (await getBkashIdToken());

  const res = await fetch(`${config.baseUrl}/payment/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-APP-Key": config.appKey,
    },
    body: JSON.stringify({ paymentID }),
  });

  return await res.json();
}
