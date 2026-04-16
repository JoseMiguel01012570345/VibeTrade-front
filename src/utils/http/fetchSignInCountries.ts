import type { SignInCountry } from "../../types/signInCountry";
import { apiFetch } from "./apiClient";

export async function fetchSignInCountries(): Promise<SignInCountry[]> {
  const res = await apiFetch("/api/v1/auth/sign-in-countries");
  if (!res.ok) {
    throw new Error(`sign-in-countries failed: ${res.status}`);
  }
  return (await res.json()) as SignInCountry[];
}
