import { TextInput } from 'flowbite-react'
import { CeField } from './CeField'
import type { CeTextFieldProps } from '@shared/types/ceUi'

export type { CeTextFieldProps } from '@shared/types/ceUi'

export function CeTextField({ id, label, color = 'gray', error, ...inputProps }: CeTextFieldProps) {
  const errId = `${id}-error`
  return (
    <CeField label={label} htmlFor={id} error={error}>
      <TextInput
        id={id}
        color={color}
        sizing="md"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        {...inputProps}
      />
    </CeField>
  )
}
