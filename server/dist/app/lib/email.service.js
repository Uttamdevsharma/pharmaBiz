"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getMailTransporter() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "") : "";
    if (user && pass) {
        if (host.includes("gmail.com")) {
            return nodemailer_1.default.createTransport({
                service: "gmail",
                auth: {
                    user,
                    pass,
                },
            });
        }
        return nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
        });
    }
    return null;
}
function getSenderAddress() {
    return (process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@pharmabiz.com").trim();
}
class EmailService {
    /**
     * Send 6-digit OTP verification email for pharmacy registration.
     * From: SMTP_USER / SMTP_FROM (Platform System Sender)
     * To: Pharmacy Owner's submitted email address
     */
    static async sendOtpEmail(payload) {
        const { to, name, otpCode, companyName } = payload;
        const recipientEmail = (to || "").trim().toLowerCase();
        const senderEmail = getSenderAddress();
        const subject = `[PharmaBiz] Your Verification Code: ${otpCode}`;
        if (!recipientEmail || !recipientEmail.includes("@")) {
            console.error(`❌ [EMAIL SERVICE] Invalid recipient email address provided: "${to}"`);
            return { success: false, error: "Invalid recipient email address" };
        }
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
            .body { padding: 32px; }
            .otp-box { background: #f1f5f9; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0284c7; }
            .footer { padding: 20px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>PharmaBiz Platform</h1>
              <p>Pharmacy Verification & Compliance Security</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                Thank you for applying to onboard <strong>${companyName || "Your Pharmacy"}</strong> on PharmaBiz.
                To complete your registration and submit your regulatory documents for review, please enter the following One-Time Password (OTP):
              </p>
              
              <div class="otp-box">
                <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
                <div class="otp-code">${otpCode}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for 15 minutes</div>
              </div>

              <p style="font-size: 12px; line-height: 1.5; color: #64748b;">
                If you did not initiate this registration request, please disregard this email.
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} PharmaBiz SaaS Platform &bull; All Rights Reserved.
            </div>
          </div>
        </body>
      </html>
    `;
        console.log(`\n========================================================`);
        console.log(`📧 [EMAIL SERVICE] DISPATCHING OTP`);
        console.log(`   FROM (System Sender) : ${senderEmail}`);
        console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
        console.log(`   OTP CODE             : ${otpCode}`);
        console.log(`   PHARMACY             : ${companyName} (${name})`);
        console.log(`========================================================\n`);
        try {
            const transporter = getMailTransporter();
            if (transporter) {
                const info = await transporter.sendMail({
                    from: `"PharmaBiz Verification" <${senderEmail}>`,
                    to: recipientEmail,
                    subject,
                    html,
                });
                console.log(`✓ [EMAIL SERVICE] OTP successfully delivered to owner: ${recipientEmail} (MsgID: ${info.messageId})`);
                return { success: true, messageId: info.messageId };
            }
            else {
                console.warn(`⚠️ [EMAIL SERVICE] SMTP not configured. OTP printed to console.`);
                return { success: true, messageId: `local_${Date.now()}` };
            }
        }
        catch (err) {
            console.error(`❌ [EMAIL SERVICE] Failed to send OTP email via SMTP to ${recipientEmail}:`, err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Send Approval Notification Email with instructions to log in using registration credentials and complete payment to unlock dashboard
     */
    static async sendApprovalEmail(payload) {
        const { to, name, companyName, planName, planTier, billingCycle, price, paymentUrl } = payload;
        const recipientEmail = (to || "").trim().toLowerCase();
        const senderEmail = getSenderAddress();
        const subject = `[PharmaBiz] Your Pharmacy Registration Has Been Approved - ${companyName}`;
        if (!recipientEmail || !recipientEmail.includes("@")) {
            console.error(`❌ [EMAIL SERVICE] Invalid recipient email address provided for approval: "${to}"`);
            return { success: false, error: "Invalid recipient email" };
        }
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
            .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.95; }
            .body { padding: 32px; }
            .highlight-msg { font-size: 15px; font-weight: 600; line-height: 1.6; color: #0f172a; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 18px 0; }
            .plan-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin: 20px 0; }
            .btn { display: inline-block; background: #0284c7; color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; margin-top: 10px; box-shadow: 0 4px 10px -2px rgba(2, 132, 199, 0.3); }
            .footer { padding: 24px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Pharmacy Registration Approved! 🎉</h1>
              <p>PharmaBiz Multi-Branch Pharmacy SaaS</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              
              <div class="highlight-msg">
                Your pharmacy registration for <strong>${companyName}</strong> has been approved. Please login using the email (<strong>${to}</strong>) and password you provided during registration. Complete the required payment first; after successful payment, you will get access to your dashboard.
              </div>

              <div class="plan-box">
                <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; margin-bottom: 4px;">Approved Subscription Details</div>
                <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${planName} (${planTier})</div>
                <div style="font-size: 13px; color: #475569; margin-top: 6px;">
                  Billing Cycle: <strong>${billingCycle}</strong> &bull; Total Payable: <strong style="font-size: 16px; color: #059669;">৳${price.toLocaleString()}</strong>
                </div>
              </div>

              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${paymentUrl}" class="btn" target="_blank">
                  Login & Complete Payment (৳${price.toLocaleString()}) &rarr;
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                Direct Link: <br />
                <a href="${paymentUrl}" style="color: #0284c7; word-break: break-all;">${paymentUrl}</a>
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} PharmaBiz SaaS Platform &bull; Regulatory Compliance & Enterprise Management
            </div>
          </div>
        </body>
      </html>
    `;
        console.log(`\n========================================================`);
        console.log(`📧 [EMAIL SERVICE] DISPATCHING APPROVAL NOTIFICATION`);
        console.log(`   FROM (System Sender) : ${senderEmail}`);
        console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
        console.log(`   PHARMACY             : ${companyName}`);
        console.log(`   PAYMENT URL          : ${paymentUrl}`);
        console.log(`========================================================\n`);
        try {
            const transporter = getMailTransporter();
            if (transporter) {
                const info = await transporter.sendMail({
                    from: `"PharmaBiz Approvals" <${senderEmail}>`,
                    to: recipientEmail,
                    subject,
                    html,
                });
                console.log(`✓ [EMAIL SERVICE] Approval email delivered to ${recipientEmail} (MsgID: ${info.messageId})`);
                return { success: true, messageId: info.messageId };
            }
            return { success: true, messageId: `local_${Date.now()}` };
        }
        catch (err) {
            console.error(`❌ [EMAIL SERVICE] Failed to send Approval email to ${recipientEmail}:`, err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Send Rejection Notification Email with reason
     */
    static async sendRejectionEmail(payload) {
        const { to, name, companyName, reason } = payload;
        const recipientEmail = (to || "").trim().toLowerCase();
        const senderEmail = getSenderAddress();
        const subject = `[PharmaBiz] Status Update: Pharmacy Application for ${companyName}`;
        if (!recipientEmail || !recipientEmail.includes("@")) {
            console.error(`❌ [EMAIL SERVICE] Invalid recipient email address provided for rejection: "${to}"`);
            return { success: false, error: "Invalid recipient email" };
        }
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
            .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background: #b91c1c; padding: 28px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
            .body { padding: 32px; }
            .reason-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 20px 0; color: #991b1b; font-size: 13px; line-height: 1.5; }
            .footer { padding: 20px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>Application Status Update</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Regulatory Compliance Review</p>
            </div>
            <div class="body">
              <p style="font-size: 15px; margin-top: 0;">Dear <strong>${name || "Pharmacy Owner"}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                Thank you for your interest in onboarding <strong>${companyName}</strong> on the PharmaBiz platform.
                After reviewing your submitted information and regulatory documents (NID, Trade License, Drug License), our administration team was unable to approve your application at this time.
              </p>
              
              <div class="reason-box">
                <div style="font-weight: 700; text-transform: uppercase; font-size: 11px; margin-bottom: 4px;">Reason for Rejection:</div>
                ${reason || "Submitted documents could not be verified or did not meet compliance criteria."}
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #334155;">
                If you believe this is an error or would like to provide updated documentation, please log in to your account to submit corrected documents or reach out to our compliance team at <strong>compliance@pharmabiz.com</strong>.
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} PharmaBiz SaaS Platform &bull; All Rights Reserved.
            </div>
          </div>
        </body>
      </html>
    `;
        console.log(`\n========================================================`);
        console.log(`📧 [EMAIL SERVICE] DISPATCHING REJECTION NOTIFICATION`);
        console.log(`   FROM (System Sender) : ${senderEmail}`);
        console.log(`   TO (Pharmacy Owner)  : ${recipientEmail}`);
        console.log(`   PHARMACY             : ${companyName}`);
        console.log(`   REASON               : ${reason}`);
        console.log(`========================================================\n`);
        try {
            const transporter = getMailTransporter();
            if (transporter) {
                const info = await transporter.sendMail({
                    from: `"PharmaBiz Compliance" <${senderEmail}>`,
                    to: recipientEmail,
                    subject,
                    html,
                });
                console.log(`✓ [EMAIL SERVICE] Rejection email delivered to ${recipientEmail} (MsgID: ${info.messageId})`);
                return { success: true, messageId: info.messageId };
            }
            return { success: true, messageId: `local_${Date.now()}` };
        }
        catch (err) {
            console.error(`❌ [EMAIL SERVICE] Failed to send Rejection email to ${recipientEmail}:`, err.message);
            return { success: false, error: err.message };
        }
    }
}
exports.EmailService = EmailService;
