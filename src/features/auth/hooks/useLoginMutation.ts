import { useMutation } from '@tanstack/react-query'
import { login } from '../api/credentialsAuth'

export function useLoginMutation() {
  return useMutation({
    mutationFn: (params: { email: string; password: string }) =>
      login(params.email, params.password),
  })
}
