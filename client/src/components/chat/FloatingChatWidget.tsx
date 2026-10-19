"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  ChevronDown,
  Loader2,
  RefreshCw,
  LogOut,
  Headphones,
  Clock,
} from "lucide-react";

interface LiveChatMessage {
  id: number;
  session_id: number;
  sender_type: "VISITOR" | "AGENT" | "SYSTEM";
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface StoredSession {
  token: string;
  name: string;
  email: string;
  phone: string;
  department: string;
}

const COUNTRY_CODES = [
  { code: "+880", label: "BD +880", flag: "🇧🇩" },
  { code: "+1", label: "US +1", flag: "🇺🇸" },
  { code: "+44", label: "UK +44", flag: "🇬🇧" },
  { code: "+91", label: "IN +91", flag: "🇮🇳" },
  { code: "+971", label: "AE +971", flag: "🇦🇪" },
  { code: "+966", label: "SA +966", flag: "🇸🇦" },
  { code: "+60", label: "MY +60", flag: "🇲🇾" },
];

export function FloatingChatWidget() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [status, setStatus] = useState<string>("WAITING");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("GENERAL");
  const [countryCode, setCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [question, setQuestion] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<any>(null);
  const lastMessageIdRef = useRef<number>(0);

  // Sound Chime Notification via Web Audio API
  const playIncomingSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Ensure component only renders after mounting on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Load existing session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pharmabiz_live_chat_session");
      if (saved) {
        const parsed: StoredSession = JSON.parse(saved);
        if (parsed && parsed.token) {
          setSession(parsed);
          fetchFullSession(parsed.token);
        }
      }
    } catch {}
  }, []);

  // Fetch full conversation for existing session
  const fetchFullSession = async (token: string) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
      const res = await fetch(`${apiUrl}/live-chat/session?sessionToken=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success && data.data) {
        const fetchedMessages = data.data.messages || [];
        setMessages(fetchedMessages);
        setStatus(data.data.session.status || "WAITING");
        if (fetchedMessages.length > 0) {
          const maxId = Math.max(...fetchedMessages.map((m: LiveChatMessage) => m.id));
          lastMessageIdRef.current = maxId;
        }
      }
    } catch (e) {
      console.error("Failed to fetch live chat session:", e);
    } finally {
      setLoading(false);
    }
  };

  // Live Polling every 3 seconds for new agent replies
  useEffect(() => {
    if (!session?.token) return;

    const interval = setInterval(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
        const afterId = lastMessageIdRef.current;
        const res = await fetch(
          `${apiUrl}/live-chat/messages?sessionToken=${encodeURIComponent(session.token)}&afterId=${afterId}`
        );
        const data = await res.json();
        if (data.success && data.data && data.data.messages?.length > 0) {
          const newMsgs: LiveChatMessage[] = data.data.messages;
          setMessages((prev) => [...prev, ...newMsgs]);
          setStatus(data.data.status);

          const maxId = Math.max(...newMsgs.map((m) => m.id));
          lastMessageIdRef.current = maxId;

          // Check if any incoming message is from AGENT
          const hasAgentMsg = newMsgs.some((m) => m.sender_type === "AGENT");
          if (hasAgentMsg) {
            playIncomingSound();
            if (!isOpen) {
              setUnreadCount((c) => c + 1);
            }
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [session?.token, isOpen]);

  // Handle Form Submit: Initiate Session
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !question.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const fullPhone = `${countryCode} ${phoneNumber.trim()}`;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
      const res = await fetch(`${apiUrl}/live-chat/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          department,
          phone: fullPhone,
          question: question.trim(),
          current_url: typeof window !== "undefined" ? window.location.href : "",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const newSession: StoredSession = {
          token: data.data.session.session_token,
          name: data.data.session.visitor_name,
          email: data.data.session.visitor_email,
          phone: data.data.session.visitor_phone,
          department: data.data.session.department,
        };

        setSession(newSession);
        setMessages(data.data.messages || []);
        setStatus(data.data.session.status || "WAITING");

        if (data.data.messages?.length > 0) {
          const maxId = Math.max(...data.data.messages.map((m: LiveChatMessage) => m.id));
          lastMessageIdRef.current = maxId;
        }

        try {
          localStorage.setItem("pharmabiz_live_chat_session", JSON.stringify(newSession));
        } catch {}
      }
    } catch (e) {
      console.error("Error creating chat session:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Visitor sends message in active session
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !session?.token) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic UI push
    const tempId = Date.now();
    const optimisticMsg: LiveChatMessage = {
      id: tempId,
      session_id: 0,
      sender_type: "VISITOR",
      sender_name: session.name || "Me",
      message: messageText,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
      const res = await fetch(`${apiUrl}/live-chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken: session.token,
          message: messageText,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.message) {
        const serverMsg: LiveChatMessage = data.data.message;
        // Replace optimistic message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? serverMsg : m))
        );
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, serverMsg.id);
      }
    } catch (e) {
      console.error("Error sending visitor message:", e);
    }
  };

  // End chat session
  const handleEndChat = () => {
    if (confirm("Are you sure you want to end this chat session?")) {
      try {
        localStorage.removeItem("pharmabiz_live_chat_session");
      } catch {}
      setSession(null);
      setMessages([]);
      setStatus("WAITING");
      lastMessageIdRef.current = 0;
    }
  };

  // Toggle open
  const handleToggleOpen = () => {
    if (!isOpen) {
      setUnreadCount(0);
    }
    setIsOpen((prev) => !prev);
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Only render on client after mounting, and hide on admin console routes
  if (!mounted || (pathname && pathname.startsWith("/admin"))) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-sm border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
                <Headphones className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm tracking-wide flex items-center gap-2 text-white">
                  PharmaBiz Live Support
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>10:00 AM – 7:00 PM (BD Time)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {session && (
                <button
                  type="button"
                  onClick={handleEndChat}
                  title="End Chat"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition text-xs flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                aria-label="Minimize"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-slate-50/70 dark:bg-slate-950/50">
            {!session ? (
              /* Pre-Chat Lead Submission Form */
              <div className="space-y-4">
                {/* Intro Card */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 shrink-0 mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          How can our team help you?
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/60 dark:border-amber-800/60 shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          10 AM – 7 PM BD
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Instant support available <strong>10:00 AM – 7:00 PM (BD Time)</strong>. Fill out the form below to connect with a pharmacy specialist.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmitForm} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-rose-500 mr-1">*</span>Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Uttam Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-rose-500 mr-1">*</span>Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-rose-500 mr-1">*</span>Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer"
                    >
                      <option value="SALES">Sales & Pricing Inquiry</option>
                      <option value="TECH_SUPPORT">Technical Support</option>
                      <option value="BILLING">Billing & Invoices</option>
                      <option value="GENERAL">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-rose-500 mr-1">*</span>Phone Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition cursor-pointer shrink-0"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="1701560326"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span className="text-rose-500 mr-1">*</span>Question / How can we help?
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Can you explain multi-branch POS pricing or medicine expiry tracking?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span>Start Chatting Now</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Active Conversation Stream */
              <div className="flex-1 flex flex-col justify-between h-full">
                {/* Department Info Bar */}
                <div className="mb-3 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] shadow-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    Dept: <strong className="text-slate-900 dark:text-white uppercase">{session.department}</strong>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : status === "RESOLVED"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
                  {loading && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    messages.map((m) => {
                      if (m.sender_type === "SYSTEM") {
                        return (
                          <div key={m.id} className="flex justify-center my-2">
                            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] text-center max-w-[90%] leading-relaxed">
                              {m.message}
                            </div>
                          </div>
                        );
                      }

                      const isVisitor = m.sender_type === "VISITOR";

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isVisitor ? "items-end" : "items-start"}`}
                        >
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5 px-1 font-medium">
                            {isVisitor ? "You" : m.sender_name || "Support Specialist"}
                          </span>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm ${
                              isVisitor
                                ? "bg-rose-600 text-white rounded-br-none"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-none"
                            }`}
                          >
                            {m.message}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 px-1">
                            {formatTime(m.created_at)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <form
                  onSubmit={handleSendMessage}
                  className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="h-10 w-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                    aria-label="Send Message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`shadow-xl flex items-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-95 ${
          isOpen
            ? "px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-rose-600/30"
            : "h-14 w-14 rounded-full bg-gradient-to-tr from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white items-center justify-center shadow-rose-600/40 relative"
        }`}
        aria-label={isOpen ? "Close Chat" : "Open Live Chat"}
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5" />
            <span>Close Chat</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-6 w-6" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-500 text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow-md animate-bounce">
                {unreadCount}
              </span>
            ) : (
              <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-ping" />
            )}
          </>
        )}
      </button>
    </div>
  );
}
