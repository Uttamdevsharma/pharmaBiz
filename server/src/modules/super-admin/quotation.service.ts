import { prisma } from "../../app/lib/prisma";
import { EmailService } from "../../app/lib/email.service";

export async function generateNextQuotationRef(): Promise<string> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const count = await (prisma as any).platform_quotations.count();
  
  let seqNum = count + 1;
  let refNo = `pharmabiz/${String(seqNum).padStart(3, "0")}/${day}/${year}`;

  // Ensure unique ref_no
  while (await (prisma as any).platform_quotations.findUnique({ where: { ref_no: refNo } })) {
    seqNum++;
    refNo = `pharmabiz/${String(seqNum).padStart(3, "0")}/${day}/${year}`;
  }

  return refNo;
}

export async function listQuotations(filters: { search?: string; status?: string }) {
  const where: any = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    where.OR = [
      { ref_no: { contains: s, mode: "insensitive" } },
      { client_name: { contains: s, mode: "insensitive" } },
      { organization_name: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
      { subject: { contains: s, mode: "insensitive" } },
    ];
  }

  const [quotations, nextRefNo] = await Promise.all([
    (prisma as any).platform_quotations.findMany({
      where,
      orderBy: { created_at: "desc" },
    }),
    generateNextQuotationRef(),
  ]);

  return { quotations, nextRefNo };
}

export async function getQuotationById(id: number) {
  return await (prisma as any).platform_quotations.findUnique({
    where: { id },
  });
}

export async function createQuotation(body: any, baseUrl?: string) {
  let ref_no = (body.ref_no || "").trim();
  if (!ref_no) {
    ref_no = await generateNextQuotationRef();
  } else {
    const existing = await (prisma as any).platform_quotations.findUnique({
      where: { ref_no },
    });
    if (existing) {
      ref_no = await generateNextQuotationRef();
    }
  }

  const created = await (prisma as any).platform_quotations.create({
    data: {
      ref_no,
      quote_date: body.quote_date ? new Date(body.quote_date) : new Date(),
      client_name: body.client_name || "Valued Client",
      organization_name: body.organization_name || null,
      address: body.address || null,
      phone: body.phone || null,
      email: body.email || null,
      subject: body.subject || "Quotation for PharmaBiz Software & Hardware Solution",
      software_columns: body.software_columns || null,
      software_rows: body.software_rows || null,
      software_amount: Number(body.software_amount || 0),
      plan_name: body.plan_name || "Pharmacy Starter",
      billing_cycle: body.billing_cycle || "MONTHLY",
      license_fee_title: body.license_fee_title || "One-time Setup & Onboarding Fee",
      license_fee_amount: Number(body.license_fee_amount || 0),
      subscription_amount: Number(body.subscription_amount || 0),
      recurring_note: body.recurring_note || null,
      has_hardware: Boolean(body.has_hardware),
      hardware_columns: body.hardware_columns || null,
      hardware_rows: body.hardware_rows || null,
      hardware_amount: Number(body.hardware_amount || 0),
      grand_total: Number(body.grand_total || 0),
      in_words: body.in_words || null,
      project_breakdown: body.project_breakdown || null,
      terms_conditions: body.terms_conditions || null,
      client_requirements: body.client_requirements || null,
      deliverables: body.deliverables || null,
      additional_notes: body.additional_notes || null,
      company_signatory_name: body.company_signatory_name || "Md. Sorower Jahan",
      company_signatory_title: body.company_signatory_title || "CEO, PharmaBiz / okobiz",
      company_phone: body.company_phone || "+880 1973590937",
      company_email: body.company_email || "info@okobiz.com",
      status: body.status || "SENT",
    },
  });

  let emailSent = false;
  let emailError = null;

  if (body.send_email && body.email) {
    try {
      let attachmentBuffer: Buffer | undefined;
      if (body.pdf_base64) {
        const base64Data = body.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        attachmentBuffer = Buffer.from(base64Data, "base64");
      }

      const appUrl = baseUrl || process.env.CLIENT_URL || "http://localhost:3001";
      const viewOnlineUrl = `${appUrl}/admin/quotations/${created.id}/print`;

      await EmailService.sendQuotationEmail({
        to: body.email,
        clientName: created.client_name,
        organizationName: created.organization_name,
        refNo: created.ref_no,
        subject: created.subject,
        grandTotal: Number(created.grand_total),
        inWords: created.in_words,
        attachmentBuffer,
        viewOnlineUrl,
      });

      await (prisma as any).platform_quotations.update({
        where: { id: created.id },
        data: { email_sent_at: new Date() },
      });

      emailSent = true;
    } catch (err: any) {
      console.error("Failed to send quotation email:", err);
      emailError = err.message || "Failed to dispatch email";
    }
  }

  return { created, emailSent, emailError };
}

export async function updateQuotation(id: number, body: any, baseUrl?: string) {
  const updated = await (prisma as any).platform_quotations.update({
    where: { id },
    data: {
      ref_no: body.ref_no,
      quote_date: body.quote_date ? new Date(body.quote_date) : undefined,
      client_name: body.client_name,
      organization_name: body.organization_name,
      address: body.address,
      phone: body.phone,
      email: body.email,
      subject: body.subject,
      software_columns: body.software_columns,
      software_rows: body.software_rows,
      software_amount: Number(body.software_amount || 0),
      plan_name: body.plan_name,
      billing_cycle: body.billing_cycle,
      license_fee_title: body.license_fee_title,
      license_fee_amount: Number(body.license_fee_amount || 0),
      subscription_amount: Number(body.subscription_amount || 0),
      recurring_note: body.recurring_note,
      has_hardware: Boolean(body.has_hardware),
      hardware_columns: body.hardware_columns,
      hardware_rows: body.hardware_rows,
      hardware_amount: Number(body.hardware_amount || 0),
      grand_total: Number(body.grand_total || 0),
      in_words: body.in_words,
      project_breakdown: body.project_breakdown,
      terms_conditions: body.terms_conditions,
      client_requirements: body.client_requirements,
      deliverables: body.deliverables,
      additional_notes: body.additional_notes,
      company_signatory_name: body.company_signatory_name,
      company_signatory_title: body.company_signatory_title,
      company_phone: body.company_phone,
      company_email: body.company_email,
      status: body.status,
    },
  });

  let emailSent = false;
  let emailError = null;

  if (body.send_email && body.email) {
    try {
      let attachmentBuffer: Buffer | undefined;
      if (body.pdf_base64) {
        const base64Data = body.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
        attachmentBuffer = Buffer.from(base64Data, "base64");
      }

      const appUrl = baseUrl || process.env.CLIENT_URL || "http://localhost:3001";
      const viewOnlineUrl = `${appUrl}/admin/quotations/${updated.id}/print`;

      await EmailService.sendQuotationEmail({
        to: body.email,
        clientName: updated.client_name,
        organizationName: updated.organization_name,
        refNo: updated.ref_no,
        subject: updated.subject,
        grandTotal: Number(updated.grand_total),
        inWords: updated.in_words,
        attachmentBuffer,
        viewOnlineUrl,
      });

      await (prisma as any).platform_quotations.update({
        where: { id: updated.id },
        data: { email_sent_at: new Date() },
      });

      emailSent = true;
    } catch (err: any) {
      console.error("Failed to send quotation update email:", err);
      emailError = err.message || "Failed to dispatch email";
    }
  }

  return { updated, emailSent, emailError };
}

export async function deleteQuotation(id: number) {
  return await (prisma as any).platform_quotations.delete({
    where: { id },
  });
}

export async function sendQuotationEmailNotification(
  id: number,
  options?: { email?: string; pdf_base64?: string; baseUrl?: string }
) {
  const quotation = await (prisma as any).platform_quotations.findUnique({
    where: { id },
  });

  if (!quotation) {
    throw new Error("Quotation not found");
  }

  const recipientEmail = options?.email || quotation.email;
  if (!recipientEmail) {
    throw new Error("Client email is required to send quotation");
  }

  let attachmentBuffer: Buffer | undefined;
  if (options?.pdf_base64) {
    const base64Data = options.pdf_base64.replace(/^data:application\/pdf;base64,/, "");
    attachmentBuffer = Buffer.from(base64Data, "base64");
  }

  const appUrl = options?.baseUrl || process.env.CLIENT_URL || "http://localhost:3001";
  const viewOnlineUrl = `${appUrl}/admin/quotations/${quotation.id}/print`;

  const emailRes = await EmailService.sendQuotationEmail({
    to: recipientEmail,
    clientName: quotation.client_name,
    organizationName: quotation.organization_name,
    refNo: quotation.ref_no,
    subject: quotation.subject,
    grandTotal: Number(quotation.grand_total),
    inWords: quotation.in_words,
    attachmentBuffer,
    viewOnlineUrl,
  });

  if (!emailRes.success) {
    throw new Error(emailRes.error || "Failed to deliver email");
  }

  await (prisma as any).platform_quotations.update({
    where: { id },
    data: {
      email_sent_at: new Date(),
      status: quotation.status === "DRAFT" ? "SENT" : quotation.status,
    },
  });

  return { success: true, recipient: recipientEmail };
}
