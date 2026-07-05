type Props = {
  title: string
  description?: string
  className?: string
}

export function CePageHeading({ title, description, className = "mb-6" }: Props) {
  return (
    <header className={className}>
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h1>
      {description ? <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p> : null}
    </header>
  )
}
