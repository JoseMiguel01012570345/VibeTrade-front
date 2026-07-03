import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type {
  AdminUserDto,
  CreateUserRequest,
  SetUserPasswordRequest,
  SetUserRolesRequest,
  UpdateUserRequest,
} from "../Dtos/users";

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

export async function listUsers(search: string): Promise<AdminUserDto[]> {
  const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
  const res = await apiFetch(`/api/v1/admin/users${qs}`);
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as AdminUserDto[];
}

export async function createUser(body: CreateUserRequest): Promise<AdminUserDto> {
  const res = await apiFetch("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as AdminUserDto;
}

export async function updateUser(
  id: string,
  body: UpdateUserRequest,
): Promise<AdminUserDto> {
  const res = await apiFetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as AdminUserDto;
}

export async function setUserRoles(
  id: string,
  body: SetUserRolesRequest,
): Promise<AdminUserDto> {
  const res = await apiFetch(
    `/api/v1/admin/users/${encodeURIComponent(id)}/roles`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as AdminUserDto;
}

export async function setUserPassword(
  id: string,
  body: SetUserPasswordRequest,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/admin/users/${encodeURIComponent(id)}/password`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) await throwFromResponse(res);
}

export async function deleteUser(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) await throwFromResponse(res);
}
