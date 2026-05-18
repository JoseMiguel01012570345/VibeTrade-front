export type E2ESession = {
  sessionToken: string;
  userId: string;
  phone: string;
  createdAt: string;
};

export const e2eApiBase =
  process.env.PLAYWRIGHT_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:5110";

function randomInternationalPhone(): string {
  const n = Math.floor(100_000_000 + Math.random() * 899_999_999);
  return `+549${n}`;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

async function requestCode(
  phone: string,
  mode: "login" | "register",
): Promise<{ code: string; codeLength: number }> {
  const body =
    mode === "register" ? { phone, mode: "register" } : { phone, mode: "login" };
  const res = await fetch(`${e2eApiBase}/api/v1/auth/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `request-code failed (${res.status}) for ${phone}: ${detail.slice(0, 200)}`,
    );
  }
  const json = await parseJson(res);
  const code = typeof json.devMockCode === "string" ? json.devMockCode : "";
  if (!code) {
    throw new Error(
      "request-code did not return devMockCode; ensure the API runs with Auth:ExposeDevCodes=true",
    );
  }
  const codeLength =
    typeof json.codeLength === "number" ? json.codeLength : code.length;
  return { code, codeLength };
}

async function verify(
  phone: string,
  code: string,
  mode: "login" | "register",
): Promise<E2ESession> {
  const body =
    mode === "register"
      ? { phone, code, mode: "register" }
      : { phone, code, mode: "login" };
  const res = await fetch(`${e2eApiBase}/api/v1/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `verify failed (${res.status}) for ${phone}: ${detail.slice(0, 200)}`,
    );
  }
  const json = await parseJson(res);
  const sessionToken =
    typeof json.sessionToken === "string" ? json.sessionToken : "";
  const user = json.user as Record<string, unknown> | undefined;
  const userId = typeof user?.id === "string" ? user.id : "";
  if (!sessionToken) {
    throw new Error("verify response missing sessionToken");
  }
  return {
    sessionToken,
    userId,
    phone,
    createdAt: new Date().toISOString(),
  };
}

export async function isE2eApiReachable(): Promise<boolean> {
  try {
    const res = await fetch(
      `${e2eApiBase}/api/v1/auth/sign-in-countries`,
      { method: "GET" },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function authenticateForE2E(): Promise<E2ESession> {
  const configuredPhone = process.env.PLAYWRIGHT_E2E_PHONE?.trim();
  const phone = configuredPhone || randomInternationalPhone();

  if (!configuredPhone) {
    const { code } = await requestCode(phone, "register");
    return verify(phone, code, "register");
  }

  try {
    const { code } = await requestCode(phone, "login");
    return await verify(phone, code, "login");
  } catch {
    const { code } = await requestCode(phone, "register");
    return verify(phone, code, "register");
  }
}
