import { CeField } from './CeField'
import { CeSelect } from './CeSelect'
import type { CeNativeSelectProps } from '@shared/types/ceUi'

export type { CeNativeSelectProps } from '@shared/types/ceUi'

/** Select con etiqueta para filtros y formularios. */
export function CeNativeSelect({ id, label, error, children, ...rest }: CeNativeSelectProps) {
  return (
    <div className="min-w-[160px] flex-1">
      <CeField label={label} htmlFor={id}>
        <CeSelect id={id} error={error} {...rest}>
          {children}
        </CeSelect>
      </CeField>
    </div>
  )
}
