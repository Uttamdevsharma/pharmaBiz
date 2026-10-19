import { prisma } from "../../app/lib/prisma";
import { CreateNoticeDto, UpdateNoticeDto, NoticeFilterQuery } from "./notices.types";

export class NoticesService {
  /**
   * 1. Super Admin: List all notices with read counts and remaining banner days
   */
  static async superAdminListNotices(query: NoticeFilterQuery = {}) {
    const where: any = {};

    if (query.type && query.type !== "ALL") {
      where.type = query.type;
    }

    if (query.is_published !== undefined && query.is_published !== "ALL") {
      where.is_published = query.is_published === "true";
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: "insensitive" } },
        { content: { contains: s, mode: "insensitive" } },
        { badge_text: { contains: s, mode: "insensitive" } },
      ];
    }

    const notices = await (prisma as any).system_notices.findMany({
      where,
      orderBy: [
        { pinned: "desc" },
        { created_at: "desc" },
      ],
      include: {
        _count: {
          select: { reads: true },
        },
      },
    });

    const now = new Date();

    const formattedNotices = notices.map((n: any) => {
      const isBannerActive =
        n.show_banner &&
        n.banner_expires_at &&
        new Date(n.banner_expires_at) > now;

      let remainingDays = 0;
      if (isBannerActive) {
        const diffMs = new Date(n.banner_expires_at).getTime() - now.getTime();
        remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        ...n,
        reads_count: n._count?.reads || 0,
        is_banner_active: isBannerActive,
        remaining_banner_days: remainingDays,
        _count: undefined,
      };
    });

    const totalCount = await (prisma as any).system_notices.count();
    const publishedCount = await (prisma as any).system_notices.count({
      where: { is_published: true },
    });

    return {
      notices: formattedNotices,
      metrics: {
        total: totalCount,
        published: publishedCount,
      },
    };
  }

  /**
   * 2. Super Admin: Create a notice
   */
  static async superAdminCreateNotice(data: CreateNoticeDto) {
    const durationDays = data.banner_duration_days || 7;
    const bannerExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const notice = await (prisma as any).system_notices.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        type: data.type || "ANNOUNCEMENT",
        badge_text: data.badge_text ? data.badge_text.trim() : null,
        pinned: data.pinned ?? false,
        is_published: data.is_published ?? true,
        show_banner: data.show_banner ?? true,
        banner_duration_days: durationDays,
        banner_expires_at: bannerExpiresAt,
        target_type: data.target_type || "ALL",
        target_business_ids: data.target_type === "SPECIFIC" ? data.target_business_ids || [] : null,
      },
    });

    return notice;
  }

  /**
   * 3. Super Admin: Update a notice
   */
  static async superAdminUpdateNotice(id: number, data: UpdateNoticeDto) {
    const existing = await (prisma as any).system_notices.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Notice not found");
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.content !== undefined) updateData.content = data.content.trim();
    if (data.type !== undefined) updateData.type = data.type;
    if (data.badge_text !== undefined) updateData.badge_text = data.badge_text ? data.badge_text.trim() : null;
    if (data.pinned !== undefined) updateData.pinned = data.pinned;
    if (data.is_published !== undefined) updateData.is_published = data.is_published;
    if (data.show_banner !== undefined) updateData.show_banner = data.show_banner;
    if (data.target_type !== undefined) updateData.target_type = data.target_type;
    if (data.target_business_ids !== undefined) {
      updateData.target_business_ids = data.target_type === "SPECIFIC" ? data.target_business_ids : null;
    }

    if (data.banner_duration_days !== undefined) {
      updateData.banner_duration_days = data.banner_duration_days;
      updateData.banner_expires_at = new Date(
        Date.now() + data.banner_duration_days * 24 * 60 * 60 * 1000
      );
    }

    const updated = await (prisma as any).system_notices.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * 4. Super Admin: Delete a notice
   */
  static async superAdminDeleteNotice(id: number) {
    const existing = await (prisma as any).system_notices.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Notice not found");
    }

    await (prisma as any).system_notices.delete({
      where: { id },
    });

    return { message: "Notice deleted successfully" };
  }

  /**
   * 5. Super Admin: Get eligible active pharmacies for target selector
   */
  static async getEligibleBusinesses() {
    const tenants = await (prisma as any).tenant.findMany({
      where: {
        verificationStatus: { in: ["ACTIVE", "APPROVED_PENDING_PAYMENT"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        verificationStatus: true,
      },
      orderBy: { name: "asc" },
    });

    return tenants;
  }

  /**
   * 6. Tenant: Fetch targeted published notices, unread state, and active banner notices
   */
  static async tenantListNotices(tenantId: string, query: { search?: string; type?: string } = {}) {
    const allPublished = await (prisma as any).system_notices.findMany({
      where: {
        is_published: true,
      },
      orderBy: [
        { pinned: "desc" },
        { created_at: "desc" },
      ],
    });

    // Filter notices targeted to this tenant: target_type === 'ALL' OR target_business_ids includes tenantId
    const targeted = allPublished.filter((n: any) => {
      if (n.target_type === "ALL") return true;
      if (Array.isArray(n.target_business_ids)) {
        return n.target_business_ids.includes(tenantId);
      }
      return false;
    });

    // Check reads
    const noticeIds = targeted.map((n: any) => n.id);
    const reads = await (prisma as any).system_notice_reads.findMany({
      where: {
        notice_id: { in: noticeIds },
        business_id: tenantId,
      },
      select: { notice_id: true, read_at: true },
    });

    const readMap = new Map(reads.map((r: any) => [r.notice_id, r.read_at]));

    let notices = targeted.map((n: any) => ({
      ...n,
      is_read: readMap.has(n.id),
      read_at: readMap.get(n.id) || null,
    }));

    // Apply optional client search and type filtering
    if (query.type && query.type !== "ALL") {
      notices = notices.filter((n: any) => n.type.toUpperCase() === query.type?.toUpperCase());
    }

    if (query.search && query.search.trim()) {
      const s = query.search.toLowerCase().trim();
      notices = notices.filter(
        (n: any) =>
          n.title.toLowerCase().includes(s) ||
          n.content.toLowerCase().includes(s) ||
          (n.badge_text && n.badge_text.toLowerCase().includes(s))
      );
    }

    const now = new Date();
    // Active banner notices: show_banner === true && banner_expires_at > now
    const bannerNotices = targeted
      .filter((n: any) => {
        if (!n.show_banner) return false;
        if (!n.banner_expires_at) return true;
        return new Date(n.banner_expires_at) > now;
      })
      .map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: n.type,
        badge_text: n.badge_text,
        is_read: readMap.has(n.id),
        created_at: n.created_at,
      }));

    const unreadCount = notices.filter((n: any) => !n.is_read).length;

    return {
      notices,
      banner_notices: bannerNotices,
      unread_count: unreadCount,
    };
  }

  /**
   * 7. Tenant: Mark a notice as read
   */
  static async tenantMarkRead(noticeId: number, tenantId: string, userId?: string) {
    const read = await (prisma as any).system_notice_reads.upsert({
      where: {
        notice_id_business_id: {
          notice_id: noticeId,
          business_id: tenantId,
        },
      },
      create: {
        notice_id: noticeId,
        business_id: tenantId,
        user_id: userId || null,
        read_at: new Date(),
      },
      update: {
        read_at: new Date(),
        user_id: userId || undefined,
      },
    });

    return read;
  }
}
