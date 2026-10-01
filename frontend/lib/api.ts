const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

interface RequestOptions extends RequestInit {
  auth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { headers, auth = true, ...requestOptions } = options;
  const token =
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem("claimflow_token");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...requestOptions,
      cache: "no-store",
      headers: {
        ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach ClaimFlow. Check your connection and try again.",
      0,
    );
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("claimflow:unauthorized"));
    }

    let message = `Request failed (${response.status}).`;
    let details: Record<string, unknown> | undefined;
    if (typeof data === "object" && data !== null) {
      details = data as Record<string, unknown>;
      const candidate = details.message ?? details.error ?? details.detail;
      if (typeof candidate === "string") message = candidate;
      if (typeof candidate === "object" && candidate !== null) {
        const validationMessages = Object.values(candidate).filter(
          (value): value is string => typeof value === "string",
        );
        if (validationMessages.length) message = validationMessages.join(" ");
      }
      if (
        typeof candidate === "object" &&
        candidate !== null &&
        "message" in candidate &&
        typeof candidate.message === "string"
      ) {
        message = candidate.message;
      }
    }
    if (response.status === 403) message = "You do not have permission to do that.";
    if (response.status === 404) message = "This record could not be found.";
    throw new ApiError(message, response.status, details);
  }
  return data as T;
}
