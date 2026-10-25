import { Request, Response } from "express";
import * as quotationService from "./quotation.service";

export class QuotationController {
  static async list(req: Request, res: Response) {
    try {
      const search = (req.query.search as string) || "";
      const status = (req.query.status as string) || "";

      const result = await quotationService.listQuotations({ search, status });

      return res.json({
        success: true,
        data: result.quotations,
        nextRefNo: result.nextRefNo,
      });
    } catch (error: any) {
      console.error("GET /api/super-admin/quotations error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch quotations",
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid quotation ID",
        });
      }

      const quotation = await quotationService.getQuotationById(id);
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: "Quotation not found",
        });
      }

      return res.json({
        success: true,
        data: quotation,
      });
    } catch (error: any) {
      console.error("GET /api/super-admin/quotations/:id error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch quotation",
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const origin = req.headers.origin || (req.headers.host ? `http://${req.headers.host}` : undefined);
      const result = await quotationService.createQuotation(req.body, origin);

      return res.status(201).json({
        success: true,
        data: result.created,
        emailSent: result.emailSent,
        emailError: result.emailError,
      });
    } catch (error: any) {
      console.error("POST /api/super-admin/quotations error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create quotation",
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid quotation ID",
        });
      }

      const origin = req.headers.origin || (req.headers.host ? `http://${req.headers.host}` : undefined);
      const result = await quotationService.updateQuotation(id, req.body, origin);

      return res.json({
        success: true,
        data: result.updated,
        emailSent: result.emailSent,
        emailError: result.emailError,
      });
    } catch (error: any) {
      console.error("PUT /api/super-admin/quotations/:id error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update quotation",
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid quotation ID",
        });
      }

      await quotationService.deleteQuotation(id);

      return res.json({
        success: true,
        message: "Quotation deleted successfully",
      });
    } catch (error: any) {
      console.error("DELETE /api/super-admin/quotations/:id error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete quotation",
      });
    }
  }

  static async sendEmail(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid quotation ID",
        });
      }

      const origin = req.headers.origin || (req.headers.host ? `http://${req.headers.host}` : undefined);
      const result = await quotationService.sendQuotationEmailNotification(id, {
        email: req.body?.email,
        pdf_base64: req.body?.pdf_base64,
        baseUrl: origin,
      });

      return res.json({
        success: true,
        message: `Quotation email successfully sent to ${result.recipient}`,
      });
    } catch (error: any) {
      console.error("POST /api/super-admin/quotations/:id/send-email error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to send email",
      });
    }
  }
}
