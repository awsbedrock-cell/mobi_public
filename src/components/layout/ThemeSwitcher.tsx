import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider'
import { cn } from '../../lib/utils'
import { IconButton } from '../ui/Button'
import { Dropdown, DropdownItem } from '../ui/Dropdown'

export const themeOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Compact menu used in the top bar. */
export function ThemeSwitcher() {
  const { preference, resolved, setPreference } = useTheme()
  const Current = preference === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun

  return (
    <Dropdown
      trigger={({ toggle, open }) => (
        <IconButton label={`Theme: ${preference}`} bordered onClick={toggle} aria-expanded={open} aria-haspopup="menu">
          <Current className="h-[18px] w-[18px]" />
        </IconButton>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-subtle">Theme</p>
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownItem
              key={value}
              active={preference === value}
              icon={<Icon className="h-4 w-4" />}
              onClick={() => {
                setPreference(value)
                close()
              }}
            >
              <span className="flex items-center justify-between">
                {label}
                {preference === value && <Check className="h-4 w-4" />}
              </span>
            </DropdownItem>
          ))}
        </>
      )}
    </Dropdown>
  )
}

/** Segmented control used on the Settings page and in the mobile drawer. */
export function ThemeSegmented({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  return (
    <div role="radiogroup" aria-label="Theme" className={cn('grid grid-cols-3 gap-1 rounded-control bg-surface-muted p-1', className)}>
      {themeOptions.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={cn(
            'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors',
            preference === value ? 'bg-surface text-primary shadow-card' : 'text-text-muted hover:text-text',
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
