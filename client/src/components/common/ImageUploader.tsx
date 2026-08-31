"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface ImageUploaderProps {
  value?: string | null;
  publicId?: string | null;
  onChange: (data: { url: string; publicId: string } | null) => void;
  folder?: string;
  label?: string;
  hint?: string;
  aspectRatio?: "square" | "wide" | "any";
}

export function ImageUploader({
  value,
  publicId,
  onChange,
  folder = "pharmacy_saas/logos",
  label = "Upload Image",
  hint = "Supports PNG, JPG, SVG, WebP up to 5MB",
  aspectRatio = "square",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    // Validate mime type
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }

    setUploading(true);

    try {
      // Read as Data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        try {
          const res = await fetchApi<{ url: string; publicId: string }>("/upload/image", {
            method: "POST",
            body: JSON.stringify({
              image: base64Data,
              folder,
              oldPublicId: publicId || undefined,
            }),
          });

          if (res.success && res.data) {
            onChange({
              url: res.data.url,
              publicId: res.data.publicId,
            });
          } else {
            setError(res.message || "Failed to upload image to Cloudinary");
          }
        } catch (err: any) {
          setError(err.message || "Upload failed");
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Could not read selected file");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Upload process failed");
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (publicId) {
      try {
        await fetchApi("/upload/image", {
          method: "DELETE",
          body: JSON.stringify({ publicId }),
        });
      } catch (err) {
        console.warn("Could not delete previous asset on remove", err);
      }
    }
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {value ? (
        <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex items-center gap-4">
          <div
            className={`relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 ${
              aspectRatio === "wide" ? "w-36 h-20" : "w-16 h-16"
            }`}
          >
            <img
              src={value}
              alt="Uploaded Preview"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Cloudinary Stored Asset</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-xs font-mono">
              {publicId || value}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Delete from Cloudinary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? "border-brand-primary bg-brand-subtle-bg"
              : "border-slate-200 dark:border-slate-800 hover:border-brand-primary/60 bg-slate-50/50 dark:bg-slate-900/50"
          }`}
        >
          {uploading ? (
            <div className="py-4 flex flex-col items-center gap-2 text-brand-primary">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-xs font-bold">Uploading to Cloudinary...</span>
            </div>
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl brand-subtle-bg flex items-center justify-center text-brand-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Click to browse or drag & drop image
              </div>
              <p className="text-[11px] text-slate-400">{hint}</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
