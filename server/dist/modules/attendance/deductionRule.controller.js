"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeductionRuleController = void 0;
const prisma_1 = require("../../app/lib/prisma");
const audit_1 = require("../../app/lib/audit");
class DeductionRuleController {
    static async getRules(req, res) {
        try {
            const { branchId } = req.query;
            const user = req.user;
            const tenantId = user.tenantId;
            if (!branchId) {
                res.status(400).json({ error: "branchId is required" });
                return;
            }
            const rule = await prisma_1.prisma.salaryDeductionRule.findUnique({
                where: { branchId: String(branchId) },
            });
            res.status(200).json(rule || { absentRuleRatio: null, lateRuleRatio: null });
        }
        catch (error) {
            console.error("[DeductionRuleController.getRules] Error:", error.message);
            res.status(500).json({ error: "Failed to get deduction rules." });
        }
    }
    static async setRules(req, res) {
        try {
            const { branchId, absentRuleRatio, lateRuleRatio } = req.body;
            const user = req.user;
            const tenantId = user.tenantId;
            if (!branchId) {
                res.status(400).json({ error: "branchId is required" });
                return;
            }
            const parseRatio = (val) => {
                if (val === null || val === "" || val === undefined)
                    return null;
                const num = Number(val);
                return isNaN(num) ? null : num;
            };
            const parsedAbsent = parseRatio(absentRuleRatio);
            const parsedLate = parseRatio(lateRuleRatio);
            const rule = await prisma_1.prisma.salaryDeductionRule.upsert({
                where: { branchId },
                update: {
                    absentRuleRatio: parsedAbsent,
                    lateRuleRatio: parsedLate,
                },
                create: {
                    tenantId,
                    branchId,
                    absentRuleRatio: parsedAbsent,
                    lateRuleRatio: parsedLate,
                    createdById: user.id,
                },
            });
            await audit_1.AuditService.log({
                tenantId,
                branchId,
                userId: user.id,
                action: "SALARY_DEDUCTION_RULE_UPDATED",
                details: { absentRuleRatio: parsedAbsent, lateRuleRatio: parsedLate },
            });
            res.status(200).json(rule);
        }
        catch (error) {
            console.error("[DeductionRuleController.setRules] Error:", error.message);
            res.status(500).json({ error: "Failed to set deduction rules." });
        }
    }
}
exports.DeductionRuleController = DeductionRuleController;
