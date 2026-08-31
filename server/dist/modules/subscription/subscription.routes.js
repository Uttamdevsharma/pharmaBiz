"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionRoutes = void 0;
const express_1 = require("express");
const subscription_controller_1 = require("./subscription.controller");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_1 = require("../../middleware/validate");
const subscription_validation_1 = require("./subscription.validation");
const router = (0, express_1.Router)();
exports.subscriptionRoutes = router;
// Publicly viewable active plans
router.get("/plans", subscription_controller_1.SubscriptionController.listPlans);
router.get("/plans/:id", subscription_controller_1.SubscriptionController.getPlanDetails);
// Tenant-scoped subscription actions (Company Owner)
router.get("/current", authenticate_1.authenticate, subscription_controller_1.SubscriptionController.getCurrentSubscription);
router.get("/history", authenticate_1.authenticate, subscription_controller_1.SubscriptionController.getSubscriptionHistory);
router.post("/subscribe", authenticate_1.authenticate, (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: subscription_validation_1.subscribeSchema }), subscription_controller_1.SubscriptionController.subscribe);
router.post("/change-plan", authenticate_1.authenticate, (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: subscription_validation_1.changePlanSchema }), subscription_controller_1.SubscriptionController.changePlan);
router.post("/renew", authenticate_1.authenticate, (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), subscription_controller_1.SubscriptionController.renew);
router.post("/cancel", authenticate_1.authenticate, (0, authorize_1.authorize)(["COMPANY_OWNER", "SUPER_ADMIN"]), (0, validate_1.validateRequest)({ body: subscription_validation_1.cancelSubscriptionSchema }), subscription_controller_1.SubscriptionController.cancel);
