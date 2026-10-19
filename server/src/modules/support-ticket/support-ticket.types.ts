export type SupportTicketCategory = "BUG" | "FEATURE" | "QUERY";
export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SupportTicketStatus =
  | "PENDING"
  | "CHECKING"
  | "WORKING"
  | "TESTING"
  | "SOLVED"
  | "CLOSED";
export type TicketSenderType = "SUPER_ADMIN" | "TENANT_USER";

export interface CreateTicketInput {
  subject: string;
  message: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  attachments?: any[];
  branchId?: string;
}

export interface CreateReplyInput {
  message: string;
  attachments?: any[];
}

export interface UpdateTicketStatusInput {
  status: SupportTicketStatus;
}
