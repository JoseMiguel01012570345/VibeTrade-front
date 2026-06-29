import { useMutation } from '@tanstack/react-query'
import { register } from '../api/credentialsAuth'

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (params: {
      password: string
      email: string
      username: string
      phone: string
    }) =>
      register(
        params.password,
        params.email,
        params.username,
        params.phone,
      ),
  })
}
