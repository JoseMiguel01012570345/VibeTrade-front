import { ArrowLeft } from 'lucide-react'
import { backRowBtnClass } from '@features/market/styles/storePageStyles'

type Props = {
  title: string
  onBack: () => void
}

export function ProfilePageHeader({ title, onBack }: Props) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="flex min-w-0 items-center gap-3 pr-[3.25rem]">
        <button
          type="button"
          className={backRowBtnClass}
          onClick={onBack}
          aria-label="Volver"
          style={{
            minWidth: 40,
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black tracking-[-0.03em]">{title}</h1>
      </div>
    </div>
  )
}
