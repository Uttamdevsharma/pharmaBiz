import Swal, { SweetAlertOptions } from "sweetalert2";

/**
 * Returns whether the document is currently in dark mode
 */
const isDarkMode = () => {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

/**
 * Modern Base Theme Configuration for SweetAlert2
 */
const getBaseThemeConfig = (): SweetAlertOptions => {
  const dark = isDarkMode();
  return {
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    confirmButtonColor: "var(--primary-color, #10b981)",
    cancelButtonColor: dark ? "#334155" : "#94a3b8",
    customClass: {
      popup: "rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl font-sans",
      title: "text-xl sm:text-2xl font-black text-slate-900 dark:text-white pt-2",
      htmlContainer: "text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300",
      confirmButton: "px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer active:scale-95",
      cancelButton: "px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition cursor-pointer active:scale-95",
    },
  };
};

/**
 * Quick Toast Alert Mixin (top-right notification with progress bar)
 */
export const showToast = (
  message: string,
  icon: "success" | "error" | "warning" | "info" = "success",
  title?: string
) => {
  const dark = isDarkMode();
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#f8fafc" : "#0f172a",
    customClass: {
      popup: "rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl font-sans !p-3.5",
      title: "text-xs sm:text-sm font-bold text-slate-900 dark:text-white",
    },
    didOpen: (toastEl) => {
      toastEl.addEventListener("mouseenter", Swal.stopTimer);
      toastEl.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  return Toast.fire({
    icon,
    title: title ? `${title}: ${message}` : message,
  });
};

/**
 * Main SweetAlert helpers
 */
export const showAlert = {
  /**
   * Shows a beautiful success modal
   */
  success: (title: string, message?: string, options?: Partial<SweetAlertOptions>) => {
    return Swal.fire({
      ...getBaseThemeConfig(),
      icon: "success",
      title,
      text: message,
      confirmButtonText: "OK",
      timer: 4500,
      timerProgressBar: true,
      ...(options as any),
    });
  },

  /**
   * Shows a beautiful error modal
   */
  error: (title: string, message?: string, options?: Partial<SweetAlertOptions>) => {
    return Swal.fire({
      ...getBaseThemeConfig(),
      icon: "error",
      title,
      text: message,
      confirmButtonText: "Close",
      confirmButtonColor: "#ef4444",
      ...(options as any),
    });
  },

  /**
   * Shows an info modal
   */
  info: (title: string, message?: string, options?: Partial<SweetAlertOptions>) => {
    return Swal.fire({
      ...getBaseThemeConfig(),
      icon: "info",
      title,
      text: message,
      confirmButtonText: "OK",
      ...(options as any),
    });
  },

  /**
   * Shows a warning modal
   */
  warning: (title: string, message?: string, options?: Partial<SweetAlertOptions>) => {
    return Swal.fire({
      ...getBaseThemeConfig(),
      icon: "warning",
      title,
      text: message,
      confirmButtonText: "Got it",
      confirmButtonColor: "#f59e0b",
      ...(options as any),
    });
  },

  /**
   * Shows a confirmation modal (e.g. Delete, Action Confirm)
   */
  confirm: async (
    title: string,
    message: string,
    confirmText = "Yes, confirm",
    cancelText = "Cancel",
    isDanger = false
  ) => {
    const result = await Swal.fire({
      ...getBaseThemeConfig(),
      icon: isDanger ? "warning" : "question",
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: isDanger ? "#ef4444" : "var(--primary-color, #10b981)",
    } as any);

    return result.isConfirmed;
  },

  /**
   * Direct Toast helper
   */
  toast: showToast,
};

export default Swal;
