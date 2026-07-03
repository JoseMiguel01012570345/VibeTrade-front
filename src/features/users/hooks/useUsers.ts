import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deleteUser,
  listUsers,
  setUserPassword,
  setUserRoles,
  updateUser,
} from "../api/usersApi";
import type {
  CreateUserRequest,
  SetUserPasswordRequest,
  SetUserRolesRequest,
  UpdateUserRequest,
} from "../Dtos/users";

export const usersQueryKeys = {
  list: (search: string) => ["admin", "users", search] as const,
  all: ["admin", "users"] as const,
};

export function useUsersList(search: string) {
  return useQuery({
    queryKey: usersQueryKeys.list(search),
    queryFn: () => listUsers(search),
    staleTime: 10_000,
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: usersQueryKeys.all });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (body: CreateUserRequest) => createUser(body),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserRequest }) =>
      updateUser(id, body),
    onSuccess: invalidate,
  });
}

export function useSetUserRoles() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SetUserRolesRequest }) =>
      setUserRoles(id, body),
    onSuccess: invalidate,
  });
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SetUserPasswordRequest }) =>
      setUserPassword(id, body),
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: invalidate,
  });
}
