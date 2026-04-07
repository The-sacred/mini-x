export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
export const API_ORIGIN = new URL(API_BASE_URL).origin;

export function getCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

export function getErrorMessage(payload, fallback = "Something went wrong.") {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (payload.error) {
    return payload.error;
  }

  if (payload.detail) {
    return payload.detail;
  }

  if (payload.message) {
    return payload.message;
  }

  const firstValue = Object.values(payload)[0];
  if (Array.isArray(firstValue)) {
    return firstValue[0];
  }

  return fallback;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", token, body, headers = {}, signal } = options;
  const requestHeaders = { ...headers };
  const config = { method, headers: requestHeaders, signal };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body instanceof FormData) {
    config.body = body;
  } else if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, config);
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { ok: response.ok, status: response.status, data };
}

export function resolveMediaUrl(value) {
  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${API_ORIGIN}${value}`;
}
