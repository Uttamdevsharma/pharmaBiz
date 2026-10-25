import { prisma } from "../../app/lib/prisma";
import { EmailService } from "../../app/lib/email.service";

export interface SmsCalculationResult {
  smsCount: number;
  isUnicode: boolean;
  charCount: number;
}

export function calculateSmsUnits(text: string): SmsCalculationResult {
  const charCount = text ? text.length : 0;
  // Check for non-ASCII characters (e.g. Bengali unicode or emojis)
  const isUnicode = /[^\u0000-\u007f]/.test(text || "");
  let smsCount = 1;
  if (isUnicode) {
    if (charCount > 70) smsCount = Math.ceil(charCount / 67);
  } else {
    if (charCount > 160) smsCount = Math.ceil(charCount / 153);
  }
  return { smsCount: Math.max(1, smsCount), isUnicode, charCount };
}

export function formatBdPhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("0")) return "88" + cleaned;
  if (cleaned.length === 10) return "880" + cleaned;
  return cleaned;
}

export async function sendDynamicSms(
  toPhone: string,
  messageText: string
): Promise<{ success: boolean; error?: string; raw?: any }> {
  try {
    const settings = await (prisma as any).platform_settings.findFirst({ where: { id: 1 } });
    if (!settings || !settings.sms_api_key) {
      return { success: false, error: "SMS Gateway is not configured. Please save API credentials first." };
    }
    const provider = settings.sms_provider || "GREENWEB";
    const apiKey = (settings.sms_api_key || "").trim();
    const formattedPhone = formatBdPhoneNumber(toPhone);
    const senderId = settings.sms_is_masking
      ? settings.sms_masking_id || settings.sms_sender_id || ""
      : settings.sms_non_masking_id || settings.sms_sender_id || "";

    // 1. Greenweb SMS Gateway
    if (provider === "GREENWEB") {
      const endpoint = settings.sms_gateway_url?.includes("api.php")
        ? settings.sms_gateway_url
        : "https://api.greenweb.com.bd/api.php";
      const params = new URLSearchParams();
      params.append("token", apiKey);
      params.append("to", formattedPhone);
      params.append("message", messageText);
      if (senderId) params.append("senderid", senderId);
      const res = await fetch(endpoint, { method: "POST", body: params });
      const text = await res.text();
      const isOk = !text.toLowerCase().includes("error") && !text.toLowerCase().includes("invalid");
      return { success: isOk, raw: text, error: isOk ? undefined : text };
    }

    // 2. MIM SMS Gateway
    if (provider === "MIM_SMS") {
      const endpoint = settings.sms_gateway_url || "https://api.mimsms.com/api/sendsms";
      const params = new URLSearchParams();
      params.append("api_key", apiKey);
      params.append("type", "text");
      params.append("contacts", formattedPhone);
      params.append("senderid", senderId || "MIM SMS");
      params.append("msg", messageText);
      const res = await fetch(endpoint, { method: "POST", body: params });
      const text = await res.text();
      return { success: res.ok, raw: text };
    }

    // 3. SSL Wireless Gateway
    if (provider === "SSL_WIRELESS") {
      const endpoint = settings.sms_gateway_url || "https://smsplus.sslwireless.com/api/v3/send-sms";
      const payload = {
        api_token: apiKey,
        sid: senderId,
        msisdn: formattedPhone,
        sms: messageText,
        csms_id: Date.now().toString(),
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      return { success: res.ok, raw: data };
    }

    // 4. Custom HTTP Gateway (GET / POST)
    const url = settings.sms_gateway_url || "";
    if (url.includes("{phone}") || url.includes("{message}")) {
      const compiledUrl = url
        .replace("{phone}", encodeURIComponent(formattedPhone))
        .replace("{message}", encodeURIComponent(messageText))
        .replace("{api_key}", encodeURIComponent(apiKey))
        .replace("{sender_id}", encodeURIComponent(senderId));
      const res = await fetch(compiledUrl);
      const text = await res.text();
      return { success: res.ok, raw: text };
    } else {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ to: formattedPhone, message: messageText, sender_id: senderId }),
      });
      const text = await res.text();
      return { success: res.ok, raw: text };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach SMS gateway" };
  }
}

export class SmsService {
  /**
   * Get current SMS Gateway platform settings
   */
  static async getSettings() {
    let settings = await (prisma as any).platform_settings.findFirst({ where: { id: 1 } });
    if (!settings) {
      settings = await (prisma as any).platform_settings.create({
        data: {
          id: 1,
          sms_provider: "GREENWEB",
          sms_gateway_url: "https://api.greenweb.com.bd/api.php",
          sms_is_masking: false,
        },
      });
    }
    return settings;
  }

  /**
   * Update SMS Gateway platform settings
   */
  static async updateSettings(data: {
    sms_provider?: string;
    sms_gateway_url?: string;
    sms_api_key?: string;
    sms_sender_id?: string;
    sms_is_masking?: boolean;
    sms_masking_id?: string;
    sms_non_masking_id?: string;
  }) {
    return await (prisma as any).platform_settings.upsert({
      where: { id: 1 },
      update: {
        sms_provider: data.sms_provider,
        sms_gateway_url: data.sms_gateway_url,
        sms_api_key: data.sms_api_key,
        sms_sender_id: data.sms_sender_id,
        sms_is_masking: Boolean(data.sms_is_masking),
        sms_masking_id: data.sms_masking_id,
        sms_non_masking_id: data.sms_non_masking_id,
      },
      create: {
        id: 1,
        sms_provider: data.sms_provider || "GREENWEB",
        sms_gateway_url: data.sms_gateway_url || "https://api.greenweb.com.bd/api.php",
        sms_api_key: data.sms_api_key,
        sms_sender_id: data.sms_sender_id,
        sms_is_masking: Boolean(data.sms_is_masking),
        sms_masking_id: data.sms_masking_id,
        sms_non_masking_id: data.sms_non_masking_id,
      },
    });
  }

  /**
   * Get list of pharmacies grouped and categorized
   */
  static async getRecipients(filter: "ALL" | "ACTIVE" | "EXPIRED" | "DEMO" | "PENDING" = "ALL") {
    const tenants = await (prisma as any).tenant.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();

    const formatted = tenants.map((tenant: any) => {
      // Find company owner or primary user
      const owner =
        tenant.users.find((u: any) => u.role === "COMPANY_OWNER") ||
        tenant.users[0] ||
        {};

      const latestSub = tenant.subscriptions?.[0];
      const endDate = latestSub?.endDate ? new Date(latestSub.endDate) : null;

      let category: "ACTIVE" | "EXPIRED" | "DEMO" | "PENDING" = "ACTIVE";

      if (tenant.verificationStatus !== "ACTIVE") {
        category = "PENDING";
      } else if (tenant.tier === "TRIAL") {
        category = "DEMO";
      } else if (latestSub) {
        if (latestSub.status === "EXPIRED" || (endDate && endDate < now)) {
          category = "EXPIRED";
        } else {
          category = "ACTIVE";
        }
      } else {
        category = "DEMO";
      }

      const expiryStr = endDate
        ? endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "N/A";

      const dueAmount = latestSub?.plan?.price ? Number(latestSub.plan.price) : 0;

      return {
        id: tenant.id,
        pharmacy_name: tenant.name,
        owner_name: owner.name || tenant.name || "Owner",
        phone: owner.phone || tenant.phone || "",
        email: owner.email || tenant.email || "",
        status: tenant.verificationStatus || "ACTIVE",
        plan_name: latestSub?.plan?.name || tenant.tier || "Standard",
        expiry_date: expiryStr,
        due_amount: dueAmount,
        category,
      };
    });

    if (filter === "ALL") {
      return formatted;
    }

    return formatted.filter((r: any) => r.category === filter);
  }

  /**
   * Dispatch campaign to targeted recipients
   */
  static async sendCampaign(payload: {
    channel: "SMS" | "EMAIL" | "BOTH";
    subject?: string;
    message: string;
    recipientIds: string[];
    origin?: string;
  }) {
    const { channel, subject = "Important Notice from PharmaBiz Platform", message, recipientIds, origin } = payload;

    if (!recipientIds || recipientIds.length === 0) {
      throw new Error("No recipient pharmacies selected.");
    }

    if (!message || !message.trim()) {
      throw new Error("Message content cannot be empty.");
    }

    // Fetch all recipients metadata
    const allRecipients = await this.getRecipients("ALL");
    const targets = allRecipients.filter((r: any) => recipientIds.includes(String(r.id)));

    let totalSmsSent = 0;
    let totalSmsFailed = 0;
    let totalEmailSent = 0;
    let totalEmailFailed = 0;

    const portalUrl = origin || process.env.CLIENT_URL || "https://pharmabiz.com";

    for (const recipient of targets) {
      // Dynamic placeholder replacement
      const interpolatedMessage = message
        .replace(/\{owner_name\}/g, recipient.owner_name || "")
        .replace(/\{pharmacy_name\}/g, recipient.pharmacy_name || "")
        .replace(/\{plan_name\}/g, recipient.plan_name || "")
        .replace(/\{expiry_date\}/g, recipient.expiry_date || "")
        .replace(/\{due_amount\}/g, String(recipient.due_amount || 0))
        .replace(/\{portal_url\}/g, portalUrl);

      // 1. Dispatch SMS
      if (channel === "SMS" || channel === "BOTH") {
        if (recipient.phone) {
          const { smsCount } = calculateSmsUnits(interpolatedMessage);
          const smsResult = await sendDynamicSms(recipient.phone, interpolatedMessage);

          if (smsResult.success) {
            totalSmsSent++;
          } else {
            totalSmsFailed++;
          }

          // Save audit log
          await (prisma as any).platform_sms_logs.create({
            data: {
              tenant_id: String(recipient.id),
              recipient_name: recipient.owner_name,
              recipient_number: recipient.phone,
              channel: "SMS",
              message: interpolatedMessage,
              sms_count: smsCount,
              status: smsResult.success ? "SENT" : "FAILED",
              response_data: typeof smsResult.raw === "string" ? smsResult.raw : JSON.stringify(smsResult.raw || smsResult.error || {}),
            },
          });
        } else {
          totalSmsFailed++;
        }
      }

      // 2. Dispatch Email
      if (channel === "EMAIL" || channel === "BOTH") {
        if (recipient.email) {
          const emailResult = await EmailService.sendCampaignNoticeEmail({
            to: recipient.email,
            subject: subject.replace(/\{pharmacy_name\}/g, recipient.pharmacy_name || ""),
            ownerName: recipient.owner_name,
            pharmacyName: recipient.pharmacy_name,
            messageHtml: interpolatedMessage,
            portalUrl,
          });

          if (emailResult.success) {
            totalEmailSent++;
          } else {
            totalEmailFailed++;
          }

          // Save audit log
          await (prisma as any).platform_sms_logs.create({
            data: {
              tenant_id: String(recipient.id),
              recipient_name: recipient.owner_name,
              recipient_number: recipient.email,
              channel: "EMAIL",
              message: interpolatedMessage,
              sms_count: 1,
              status: emailResult.success ? "SENT" : "FAILED",
              response_data: JSON.stringify(emailResult),
            },
          });
        } else {
          totalEmailFailed++;
        }
      }
    }

    return {
      success: true,
      totalSmsSent,
      totalSmsFailed,
      totalEmailSent,
      totalEmailFailed,
      totalRecipients: targets.length,
    };
  }

  /**
   * Get paginated logs with search & filters
   */
  static async getLogs(query: {
    page?: number;
    limit?: number;
    status?: string;
    dateRange?: string;
    search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by status (SENT, FAILED, DELIVERED)
    if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }

    // Filter by date range
    if (query.dateRange && query.dateRange !== "ALL") {
      const now = new Date();
      if (query.dateRange === "TODAY") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        where.created_at = { gte: startOfDay };
      } else if (query.dateRange === "7DAYS") {
        const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.created_at = { gte: past7Days };
      } else if (query.dateRange === "30DAYS") {
        const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        where.created_at = { gte: past30Days };
      }
    }

    // Filter by search string (phone, name, or message text)
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { recipient_number: { contains: s, mode: "insensitive" } },
        { recipient_name: { contains: s, mode: "insensitive" } },
        { message: { contains: s, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      (prisma as any).platform_sms_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      (prisma as any).platform_sms_logs.count({ where }),
    ]);

    return {
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
