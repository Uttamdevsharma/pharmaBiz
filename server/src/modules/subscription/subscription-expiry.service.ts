import { prisma } from "../../app/lib/prisma";
import { EmailService } from "../../app/lib/email.service";

export class SubscriptionExpiryService {
  /**
   * Automated service method to scan active subscriptions expiring in 2 days,
   * send dynamic HTML reminder emails to pharmacy owners, create in-app alerts,
   * and mark expiryReminderSentAt to guarantee single dispatch.
   */
  static async checkAndSendExpiryReminders(): Promise<{ sentCount: number; errorsCount: number }> {
    console.log(`\n🔍 [EXPIRY SCHEDULER] Running automated subscription expiry scan...`);
    let sentCount = 0;
    let errorsCount = 0;

    try {
      const now = new Date();
      // Target window: 2 days (48 hours) from now.
      // We check subscriptions expiring within 2.5 days (60 hours) from now that haven't been reminded.
      const twoDaysFromNow = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);

      const expiringSubscriptions = await (prisma as any).subscription.findMany({
        where: {
          status: "ACTIVE",
          expiryReminderSentAt: null,
          endDate: {
            gte: now,
            lte: twoDaysFromNow,
          },
        },
        include: {
          plan: true,
          tenant: {
            include: {
              users: {
                where: { role: "COMPANY_OWNER" },
                take: 1,
              },
            },
          },
        },
      });

      console.log(`ℹ️ [EXPIRY SCHEDULER] Found ${expiringSubscriptions.length} subscription(s) expiring within 2 days awaiting reminders.`);

      const clientUrl = (process.env.CLIENT_URL || "http://localhost:3001").replace(/\/$/, "");
      const renewUrl = `${clientUrl}/dashboard/subscription/plans`;

      for (const sub of expiringSubscriptions) {
        try {
          const tenant = sub.tenant;
          const plan = sub.plan;
          const ownerUser = tenant?.users?.[0];

          const recipientEmail = (ownerUser?.email || tenant?.email || "").trim();
          const recipientName = ownerUser?.name || tenant?.name || "Pharmacy Owner";
          const companyName = tenant?.name || "Pharmacy";
          const planName = plan?.name || "Subscription Plan";
          const planTier = plan?.tier || tenant?.tier || "STARTER";

          if (!recipientEmail || !recipientEmail.includes("@")) {
            console.warn(`⚠️ [EXPIRY SCHEDULER] Skipping sub #${sub.id}: No valid email found for tenant ${companyName}`);
            continue;
          }

          // 1. Send dynamic email via EmailService
          const emailRes = await EmailService.sendSubscriptionExpiryReminderEmail({
            to: recipientEmail,
            name: recipientName,
            companyName,
            planName,
            planTier,
            expiryDate: sub.endDate,
            renewUrl,
          });

          if (emailRes.success) {
            // 2. Mark expiryReminderSentAt to prevent duplicate reminders
            await (prisma as any).subscription.update({
              where: { id: sub.id },
              data: { expiryReminderSentAt: new Date() },
            });

            // 3. Create in-app system notification for tenant
            await (prisma as any).notification.create({
              data: {
                tenantId: tenant.id,
                title: "Subscription Expiring in 2 Days",
                message: `Your current subscription (${planName}) will expire on ${new Date(sub.endDate).toLocaleDateString()}. Please renew or upgrade to ensure uninterrupted POS billing and inventory access.`,
                type: "SYSTEM",
              },
            });

            sentCount++;
          } else {
            errorsCount++;
          }
        } catch (err: any) {
          console.error(`❌ [EXPIRY SCHEDULER] Error processing reminder for sub #${sub.id}:`, err.message);
          errorsCount++;
        }
      }

      console.log(`✓ [EXPIRY SCHEDULER] Scan complete. Reminders sent: ${sentCount}, Errors: ${errorsCount}\n`);
    } catch (err: any) {
      console.error(`❌ [EXPIRY SCHEDULER] Failed to run expiry scan:`, err.message);
    }

    return { sentCount, errorsCount };
  }

  /**
   * Initializes automatic background schedule timer on server boot.
   * Runs immediately on boot and sets up a recurring 1-hour interval check.
   */
  static initAutomatedScheduler() {
    console.log(`⚡ [EXPIRY SCHEDULER] Initializing background subscription expiry notification service...`);
    
    // Initial run on boot
    this.checkAndSendExpiryReminders().catch((err) => {
      console.error("Initial expiry reminder check failed", err);
    });

    // Schedule recurring check every 1 hour (3,600,000 ms)
    const ONE_HOUR = 60 * 60 * 1000;
    setInterval(() => {
      this.checkAndSendExpiryReminders().catch((err) => {
        console.error("Scheduled expiry reminder check failed", err);
      });
    }, ONE_HOUR);
  }
}
