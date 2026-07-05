import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "./apiErrorMessage";
import { VtHttpError } from "./VtHttpError";

export async function throwFromResponse(
  res: Response,
  fallback: string = defaultUnexpectedErrorMessage(),
): Promise<never> {
  const text = await res.text().catch(() => "");
  let code: string | undefined;
  try {
    const parsed = JSON.parse(text) as { error?: string; code?: string };
    code =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.code === "string"
          ? parsed.code
          : undefined;
  } catch {
    /* cuerpo no JSON */
  }
  throw new VtHttpError(apiErrorTextToUserMessage(text, fallback), {
    status: res.status,
    code,
    bodyText: text,
  });
}
