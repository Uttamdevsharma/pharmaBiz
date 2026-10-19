import { loadingProgress } from "./loadingProgress";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: any[];
}

export interface FetchApiOptions extends Omit<RequestInit, "body"> {
  body?: any;
  skipCache?: boolean;
  skipProgress?: boolean;
}

// In-memory GET cache for instant page switches and prefetching without spinners
const apiGetCache = new Map<string, { data: ApiResponse<any>; timestamp: number }>();
const CACHE_TTL_MS = 25_000; // 25 seconds cache

export function clearApiCache() {
  apiGetCache.clear();
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchApiOptions = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const branchId = typeof window !== "undefined" ? localStorage.getItem("pharmacy_selected_branch_id") : null;

  // Clear cache on mutations (POST, PUT, DELETE, PATCH)
  if (method !== "GET") {
    apiGetCache.clear();
  }

  // Check cache for GET requests
  const cacheKey = `${endpoint}_${branchId || "all"}_${token ? "auth" : "anon"}`;
  if (method === "GET" && !options.skipCache) {
    const cached = apiGetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as ApiResponse<T>;
    }
  }

  if (!options.skipProgress) {
    loadingProgress.start();
  }
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(branchId && branchId !== "all" && branchId !== "" ? { "x-branch-id": branchId } : {}),
      ...options.headers,
    };

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const finalBody =
      options.body && typeof options.body === "object" && !isFormData
        ? JSON.stringify(options.body)
        : options.body;

    const response = await fetch(url, {
      ...options,
      headers,
      body: finalBody,
    });

    const data = await response.json();

    if (method === "GET" && data && data.success) {
      apiGetCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data as ApiResponse<T>;
  } finally {
    if (!options.skipProgress) {
      loadingProgress.done();
    }
  }
}
