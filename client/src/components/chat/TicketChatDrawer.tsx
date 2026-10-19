"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle,
  HelpCircle,
  Bug,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { showAlert } from "@/lib/swal";

export interface TicketReply {
  id: number;
  ticket_id: number;
  sender_id: string;
  sender_type: "SUPER_ADMIN" | "TENANT_USER";
  message: string;
  attachments?: any;
  is_read: boolean;
  created_at: string;
}

export interface SupportTicketDetail {
  id: number;
  ticket_no: string;
  business_id: string;
  user_id: string;
  subject: string;
  message: string;
  category: "BUG" | "FEATURE" | "QUERY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "CHECKING" | "WORKING" | "TESTING" | "SOLVED" | "CLOSED";
  attachments?: any;
  created_at: string;
  updated_at: string;
}

interface TicketChatDrawerProps {
  ticketId: number | null;
  isOpen: boolean;
  onClose: () => void;
  viewerMode: "TENANT" | "SUPER_ADMIN";
  onStatusUpdated?: () => void;
}

export function TicketChatDrawer({
  ticketId,
  isOpen,
  onClose,
  viewerMode,
  onStatusUpdated,
}: TicketChatDrawerProps) {
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const loadTicket = async (showLoading = true) => {
    if (!ticketId) return;
    if (showLoading) setLoading(true);

    try {
      const endpoint =
        viewerMode === "TENANT"
          ? `/tenant/support-tickets/${ticketId}`
          : `/super-admin/support-tickets/${ticketId}`;

      const res = await fetchApi<{
        ticket: SupportTicketDetail;
        replies: TicketReply[];
        tenant?: any;
        creator?: any;
      }>(endpoint, { skipCache: true, skipProgress: true });

      if (res.success && res.data) {
        setTicket(res.data.ticket);
        setReplies(res.data.replies || []);
        if (res.data.tenant) setTenantInfo(res.data.tenant);
        if (res.data.creator) setCreatorInfo(res.data.creator);
      }
    } catch (e) {
      console.error("Failed to load ticket details:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket(true);
      setTimeout(() => scrollToBottom(false), 150);
    } else {
      setTicket(null);
      setReplies([]);
      setPastedImage(null);
      setAttachmentUrl("");
      setReplyMessage("");
    }
  }, [isOpen, ticketId]);

  // Polling for new messages every 4s while open
  useEffect(() => {
    if (!isOpen || !ticketId) return;

    const interval = setInterval(() => {
      loadTicket(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, ticketId]);

  // Scroll to bottom on new replies
  useEffect(() => {
    if (replies.length > 0) {
      scrollToBottom(true);
    }
  }, [replies.length]);

  // Clipboard Paste listener for screenshots (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const base64 = uploadEvent.target?.result as string;
            setPastedImage(base64);
            showAlert.toast("Screenshot pasted from clipboard!", "info");
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  // File Upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setPastedImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Reply
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() && !pastedImage && !attachmentUrl) return;
    if (!ticketId) return;

    try {
      setSending(true);
      const attachments = [];
      if (pastedImage) attachments.push({ type: "image", url: pastedImage });
      if (attachmentUrl.trim()) attachments.push({ type: "link", url: attachmentUrl.trim() });

      const endpoint =
        viewerMode === "TENANT"
          ? `/tenant/support-tickets/${ticketId}/replies`
          : `/super-admin/support-tickets/${ticketId}/replies`;

      const res = await fetchApi<{ reply: TicketReply }>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          message: replyMessage.trim() || (pastedImage ? "Attached screenshot" : "Shared link"),
          attachments: attachments.length > 0 ? attachments : null,
        }),
        skipProgress: true,
      });

      if (res.success && res.data?.reply) {
        setReplies((prev) => [...prev, res.data!.reply]);
        setReplyMessage("");
        setPastedImage(null);
        setAttachmentUrl("");
        setShowUrlInput(false);
        setTimeout(() => scrollToBottom(true), 50);
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (e) {
      showAlert.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  // Update Status dropdown
  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId || !ticket) return;

    try {
      const endpoint =
        viewerMode === "TENANT"
          ? `/tenant/support-tickets/${ticketId}`
          : `/super-admin/support-tickets/${ticketId}`;

      const res = await fetchApi(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
        skipProgress: true,
      });

      if (res.success) {
        setTicket({ ...ticket, status: newStatus as any });
        showAlert.toast(`Ticket marked as ${newStatus}`, "success");
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (e) {
      showAlert.error("Failed to update status");
    }
  };

  if (!isOpen) return null;

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "BUG":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <Bug className="h-3 w-3" />
            Bug
          </span>
        );
      case "FEATURE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Sparkles className="h-3 w-3" />
            Feature
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <HelpCircle className="h-3 w-3" />
            Query
          </span>
        );
    }
  };

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "URGENT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            Urgent
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            High
          </span>
        );
      case "LOW":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (s?: string) => {
    switch (s) {
      case "WORKING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <Wrench className="h-3 w-3" />
            Working
          </span>
        );
      case "CHECKING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="h-3 w-3" />
            Checking
          </span>
        );
      case "SOLVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Solved
          </span>
        );
      case "CLOSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertCircle className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl h-[92vh] max-h-[820px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            {/* Ticket ID Badge */}
            <span className="px-3 py-1 rounded-xl bg-teal-600 text-white font-black text-xs shadow-sm">
              {ticket?.ticket_no || "TCK-..."}
            </span>
            {getCategoryBadge(ticket?.category)}
            {getPriorityBadge(ticket?.priority)}
            {getStatusBadge(ticket?.status)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Status Switcher Dropdown */}
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <span className="hidden sm:inline">Status:</span>
              <select
                value={ticket?.status || "PENDING"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
              >
                <option value="PENDING">Pending</option>
                <option value="CHECKING">Checking</option>
                <option value="WORKING">Working</option>
                <option value="TESTING">Testing</option>
                <option value="SOLVED">Solved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadTicket(true)}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition"
              title="Refresh Thread"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Subject Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {ticket?.subject || "Loading Ticket..."}
          </h2>
          {tenantInfo && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Store: <strong className="text-slate-700 dark:text-slate-200">{tenantInfo.name}</strong> •{" "}
              {creatorInfo?.name ? `Created by ${creatorInfo.name}` : ""}
            </p>
          )}
        </div>

        {/* Messages Stream Container (Strict isolated scrolling) */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 sidebar-scrollbar bg-slate-50/50 dark:bg-slate-950/40"
        >
          {loading && !ticket ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <span className="text-xs font-semibold">Loading conversation thread...</span>
            </div>
          ) : (
            <>
              {/* Initial Ticket Message Box */}
              {ticket && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                      <span>Original Request by {creatorInfo?.name || "Store Owner"}</span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase">
                        Tenant
                      </span>
                    </span>
                    <span>{formatDateTime(ticket.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {ticket.message}
                  </p>

                  {/* Initial Attachments */}
                  {ticket.attachments && Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                      {ticket.attachments.map((att: any, idx: number) => {
                        const isImg = att.type === "image" || att.url?.startsWith("data:image");
                        return isImg ? (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-[200px] hover:opacity-90 transition"
                          >
                            <img src={att.url} alt="Attachment" className="max-h-32 object-cover" />
                          </a>
                        ) : (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-teal-600 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>View Link</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Replies History */}
              {replies.map((r) => {
                const isTenantUser = r.sender_type === "TENANT_USER";

                return (
                  <div
                    key={r.id}
                    className={`flex flex-col ${isTenantUser ? "items-end" : "items-start"}`}
                  >
                    {/* Header Label */}
                    <div className="flex items-center gap-1.5 text-[11px] mb-1 px-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {isTenantUser
                          ? `${creatorInfo?.name || "Business Owner"} • Tenant`
                          : "Super Admin / Support Team"}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          isTenantUser
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            : "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
                        }`}
                      >
                        {isTenantUser ? "Tenant" : "Support Staff"}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                        isTenantUser
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tr-xs"
                          : "bg-teal-50 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 border border-teal-200/70 dark:border-teal-800/60 rounded-tl-xs"
                      }`}
                    >
                      {r.message}

                      {/* Attachments / Screenshots */}
                      {r.attachments && Array.isArray(r.attachments) && r.attachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-2">
                          {r.attachments.map((att: any, idx: number) => {
                            const isImg = att.type === "image" || att.url?.startsWith("data:image");
                            return isImg ? (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-[240px] hover:opacity-90 transition"
                              >
                                <img
                                  src={att.url}
                                  alt="Screenshot"
                                  className="max-h-40 object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-teal-600 hover:underline border border-slate-200 dark:border-slate-700"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>{att.url}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {formatDateTime(r.created_at)}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-3">
          {/* Pasted Screenshot Preview Banner */}
          {pastedImage && (
            <div className="relative inline-block border-2 border-teal-500 rounded-2xl overflow-hidden shadow-sm">
              <img src={pastedImage} alt="Pasted Screenshot" className="h-20 object-cover" />
              <button
                type="button"
                onClick={() => setPastedImage(null)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition"
                title="Remove Screenshot"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Optional URL input box */}
          {showUrlInput && (
            <div className="flex items-center gap-2">
              <input
                type="url"
                placeholder="Paste reference link or documentation URL..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <textarea
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder={`Type your reply to the ${
                viewerMode === "TENANT" ? "Super-Admin support team" : "pharmacy business owner"
              } here (Ctrl+V to paste screenshot)...`}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition resize-none"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Attach Screenshot / File</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Or optional link...</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSendReply()}
              disabled={(!replyMessage.trim() && !pastedImage && !attachmentUrl) || sending}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 transition active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
