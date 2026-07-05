import { CeField } from './CeField'
import { CeSelect } from './CeSelect'
import type { CeSelectFieldProps } from '@shared/types/ceUi'

export type { CeSelectFieldProps } from '@shared/types/ceUi'

export function CeSelectField({ id, label, error, children, ...selectProps }: CeSelectFieldProps) {
  return (
    <CeField label={label} htmlFor={id}>
      <CeSelect id={id} error={error} {...selectProps}>
        {children}
      </CeSelect>
    </CeField>
  )
}
