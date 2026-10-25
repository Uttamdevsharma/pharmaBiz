"use client";

import React, { useState, useEffect } from "react";
import { Server, KeyRound, Shield, Save, Eye, EyeOff, CheckCircle2, RefreshCw } from "lucide-react";
import Swal from "sweetalert2";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function SmsGatewaySettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({
    sms_provider: "GREENWEB",
    sms_gateway_url: "",
    sms_api_key: "",
    sms_sender_id: "",
    sms_is_masking: false,
    sms_masking_id: "",
    sms_non_masking_id: "",
  });

  useEffect(() => {
    fetch("/api/super-admin/sms/settings", {
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setForm({
            sms_provider: data.data.sms_provider || "GREENWEB",
            sms_gateway_url: data.data.sms_gateway_url || "",
            sms_api_key: data.data.sms_api_key || "",
            sms_sender_id: data.data.sms_sender_id || "",
            sms_is_masking: Boolean(data.data.sms_is_masking),
            sms_masking_id: data.data.sms_masking_id || "",
            sms_non_masking_id: data.data.sms_non_masking_id || "",
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load SMS settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleProviderChange = (provider: string) => {
    let defaultUrl = form.sms_gateway_url;
    if (provider === "GREENWEB" && (!form.sms_gateway_url || form.sms_gateway_url.includes("mimsms") || form.sms_gateway_url.includes("sslwireless"))) {
      defaultUrl = "https://api.greenweb.com.bd/api.php";
    } else if (provider === "MIM_SMS" && (!form.sms_gateway_url || form.sms_gateway_url.includes("greenweb") || form.sms_gateway_url.includes("sslwireless"))) {
      defaultUrl = "https://api.mimsms.com/api/sendsms";
    } else if (provider === "SSL_WIRELESS" && (!form.sms_gateway_url || form.sms_gateway_url.includes("greenweb") || form.sms_gateway_url.includes("mimsms"))) {
      defaultUrl = "https://smsplus.sslwireless.com/api/v3/send-sms";
    }
    setForm({ ...form, sms_provider: provider, sms_gateway_url: defaultUrl });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/super-admin/sms/settings", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({
          title: "Settings Saved",
          text: "SMS Gateway configuration updated successfully!",
          icon: "success",
          confirmButtonColor: "#0d9488",
        });
      } else {
        Swal.fire("Error", data.message || "Failed to update settings", "error");
      }
    } catch {
      Swal.fire("Error", "Network error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
        <p className="text-sm">Loading SMS Gateway Configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Server className="w-6 h-6 text-teal-600" />
          SMS Gateway Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure your purchased SMS provider API keys and sender credentials for platform notifications.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-5 shadow-xs"
      >
        {/* Provider Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            SMS Gateway Provider
          </label>
          <select
            value={form.sms_provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="GREENWEB">Greenweb Bangladesh (Greenweb BD)</option>
            <option value="MIM_SMS">MIM SMS (mimsms.com)</option>
            <option value="SSL_WIRELESS">SSL Wireless SMS Plus</option>
            <option value="CUSTOM">Custom HTTP API (GET / POST)</option>
          </select>
        </div>

        {/* API Gateway URL */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Gateway Endpoint URL
          </label>
          <input
            type="text"
            value={form.sms_gateway_url}
            onChange={(e) => setForm({ ...form, sms_gateway_url: e.target.value })}
            placeholder="e.g. https://api.greenweb.com.bd/api.php"
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          {form.sms_provider === "CUSTOM" && (
            <p className="text-[11px] text-slate-400 mt-1">
              Supports placeholders: <code className="text-teal-600 font-mono">&#123;phone&#125;</code>, <code className="text-teal-600 font-mono">&#123;message&#125;</code>, <code className="text-teal-600 font-mono">&#123;api_key&#125;</code>, <code className="text-teal-600 font-mono">&#123;sender_id&#125;</code>
            </p>
          )}
        </div>

        {/* API Key / Token */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            API Key / Secret Token
          </label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={form.sms_api_key}
              onChange={(e) => setForm({ ...form, sms_api_key: e.target.value })}
              placeholder="Paste provider secret token here"
              className="w-full text-xs p-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Masking Toggle & IDs */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={form.sms_is_masking}
              onChange={(e) => setForm({ ...form, sms_is_masking: e.target.checked })}
              className="rounded accent-teal-600 w-4 h-4 cursor-pointer"
            />
            Enable Masking Sender ID (Official Brand Name)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Masking Sender ID
              </label>
              <input
                type="text"
                value={form.sms_masking_id}
                onChange={(e) => setForm({ ...form, sms_masking_id: e.target.value })}
                placeholder="e.g. PharmaBiz"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Non-Masking Sender ID (Fallback Number)
              </label>
              <input
                type="text"
                value={form.sms_non_masking_id}
                onChange={(e) => setForm({ ...form, sms_non_masking_id: e.target.value })}
                placeholder="e.g. 8809612xxxxxx"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Gateway Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
