import { prisma } from "../src/app/lib/prisma";

async function main() {
  const plans = await (prisma as any).subscriptionPlan.findMany();
  for (const plan of plans) {
    const feat = (typeof plan.features === "object" && plan.features !== null) ? plan.features : {};
    if (!feat.featureList || !Array.isArray(feat.featureList) || feat.featureList.length === 0) {
      if (plan.tier === "ENTERPRISE") {
        feat.featureList = [
          "Unlimited Branches & Scalable Staff Quota",
          "Centralized Multi-Store Inventory & Transfers",
          "Full Expiry, Damage & Batch Audit Trails",
          "Unlimited Custom Roles & Granular RBAC",
          "Advanced Business Analytics & VAT/Tax Export",
          "24/7 Dedicated Account Manager & WhatsApp SLA"
        ];
      } else if (plan.tier === "GROWTH") {
        feat.featureList = [
          "Full Offline POS Counter Dispensing",
          "Multi-Branch Stock Synchronization",
          "Inventory & Batch Expiry Tracking",
          "Sales & Financial Ledger Analytics",
          "Inter-Branch Transfers & Approvals"
        ];
      } else {
        feat.featureList = [
          "Full Offline POS Counter Dispensing",
          "Real-time Inventory & Stock Tracking",
          "Medicine Expiry & Low-Stock Alerts",
          "Thermal Receipt & Barcode Support",
          "Daily Sales & Revenue Reports"
        ];
      }
      await (prisma as any).subscriptionPlan.update({
        where: { id: plan.id },
        data: { features: feat }
      });
      console.log(`Updated featureList for plan: ${plan.name}`);
    }
  }
}

main().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
