'use client'

import { type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Form field primitives.
 *
 * Every control gets a real <label for>, an error message wired through
 * aria-describedby, and aria-invalid when it fails. Errors are rendered next to
 * the control AND collected into the summary at the top of the form, because a
 * message that only exists next to the input is easy to miss when a long form
 * fails.
 */

const controlBase =
  'w-full rounded-md border bg-[color:color-mix(in_oklab,var(--ink-900)_80%,transparent)] px-4 py-3.5 text-[0.95rem] text-bone-100 transition-colors duration-[var(--dur-fast)] placeholder:text-[color:var(--ash-500)] focus:outline-none focus-visible:border-[color:var(--sand-400)]'

const controlState = (invalid: boolean) =>
  invalid
    ? 'border-[color:var(--error)]'
    : 'border-[color:var(--hairline-strong)] hover:border-[color:var(--ash-500)]'

type BaseProps = {
  id: string
  label: string
  error?: string
  optional?: boolean
  hint?: string
  children?: ReactNode
}

function Shell({
  id,
  label,
  error,
  optional,
  hint,
  children,
  className,
}: BaseProps & { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="t-label flex items-center gap-2 text-[color:var(--text-secondary)]">
        {label}
        {optional ? (
          <span className="normal-case tracking-normal text-[color:var(--text-muted)]">(optional)</span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p id={`${id}-hint`} className="t-mono text-[color:var(--text-muted)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={`${id}-error`} className="t-mono text-[color:var(--error)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined

export function TextField({
  id,
  label,
  error,
  optional,
  hint,
  className,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <Shell id={id} label={label} error={error} optional={optional} hint={hint} className={className}>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlBase, controlState(Boolean(error)))}
        {...rest}
      />
    </Shell>
  )
}

export function TextAreaField({
  id,
  label,
  error,
  optional,
  hint,
  className,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <Shell id={id} label={label} error={error} optional={optional} hint={hint} className={className}>
      <textarea
        id={id}
        name={id}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(controlBase, controlState(Boolean(error)), 'resize-y min-h-[8rem]')}
        {...rest}
      />
    </Shell>
  )
}

export function SelectField({
  id,
  label,
  error,
  optional,
  hint,
  placeholder,
  options,
  className,
  ...rest
}: BaseProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    placeholder: string
    options: readonly { value: string; label: string }[]
    className?: string
  }) {
  return (
    <Shell id={id} label={label} error={error} optional={optional} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(controlBase, controlState(Boolean(error)), 'appearance-none pr-11')}
          {...rest}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--ash-500)]"
        >
          <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
            <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </Shell>
  )
}

export function CheckboxField({
  id,
  error,
  children,
  ...rest
}: {
  id: string
  error?: string
  children: ReactNode
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'mt-[3px] h-[1.05rem] w-[1.05rem] shrink-0 cursor-pointer appearance-none rounded-[3px] border bg-transparent transition-colors duration-[var(--dur-fast)]',
            'checked:border-[color:var(--sand-400)] checked:bg-[color:var(--signal-amber)]',
            'checked:bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20d%3D%22M2.5%206.2l2.4%202.4L9.6%203.9%22%20fill%3D%22none%22%20stroke%3D%22%23070706%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E")] checked:bg-[length:0.8rem] checked:bg-center checked:bg-no-repeat',
            error ? 'border-[color:var(--error)]' : 'border-[color:var(--hairline-strong)]',
          )}
          {...rest}
        />
        <label htmlFor={id} className="text-[0.88rem] leading-relaxed text-[color:var(--text-secondary)]">
          {children}
        </label>
      </div>

      {error ? (
        <p id={`${id}-error`} className="t-mono pl-[1.8rem] text-[color:var(--error)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Honeypot. Off-screen rather than display:none so naive bots still fill it,
 * removed from the tab order and hidden from assistive technology.
 */
export function Honeypot({ id }: { id: string }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-0 h-px w-px overflow-hidden">
      <label htmlFor={id}>Website</label>
      <input id={id} name={id} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  )
}
