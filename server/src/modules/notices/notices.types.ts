export type NoticeType = "ANNOUNCEMENT" | "MAINTENANCE" | "FEATURE" | "UPDATE";
export type TargetType = "ALL" | "SPECIFIC";

export interface CreateNoticeDto {
  title: string;
  content: string;
  type?: NoticeType;
  badge_text?: string | null;
  pinned?: boolean;
  is_published?: boolean;
  show_banner?: boolean;
  banner_duration_days?: number;
  target_type?: TargetType;
  target_business_ids?: string[] | null;
}

export interface UpdateNoticeDto {
  title?: string;
  content?: string;
  type?: NoticeType;
  badge_text?: string | null;
  pinned?: boolean;
  is_published?: boolean;
  show_banner?: boolean;
  banner_duration_days?: number;
  target_type?: TargetType;
  target_business_ids?: string[] | null;
}

export interface NoticeFilterQuery {
  search?: string;
  type?: string;
  is_published?: string;
}
