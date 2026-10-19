export type LiveChatDepartment = 'SALES' | 'TECH_SUPPORT' | 'BILLING' | 'GENERAL';
export type LiveChatStatus = 'WAITING' | 'ACTIVE' | 'RESOLVED' | 'CLOSED';
export type LiveChatSenderType = 'VISITOR' | 'AGENT' | 'SYSTEM';

export interface CreateChatSessionInput {
  name: string;
  email: string;
  phone: string;
  department: LiveChatDepartment;
  question: string;
  current_url?: string;
  user_agent?: string;
}

export interface SendVisitorMessageInput {
  sessionToken: string;
  message: string;
}

export interface AdminSendMessageInput {
  message: string;
}

export interface UpdateSessionStatusInput {
  status: LiveChatStatus;
}
