const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:5000";

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    token,
    headers,
    ...requestOptions
  } = options;

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...requestOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...headers,
      },
    },
  );

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
          ? data.error
          : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}