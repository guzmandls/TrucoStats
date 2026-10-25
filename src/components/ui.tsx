import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { AvatarSilhouette, CloseIcon, DotsIcon, MenuIcon } from './Icons'
import styles from './ui.module.css'

function cx(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(' ')
}

interface PageHeaderProps {
  title?: string
  // Si se pasa, el título se puede tocar (por ejemplo, para cambiar el nombre
  // del grupo); `titleActionLabel` dice qué hace, para los lectores de pantalla.
  onTitleClick?: () => void
  titleActionLabel?: string
  center?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
}

export function PageHeader({
  title,
  onTitleClick,
  titleActionLabel,
  center,
  leading,
  trailing,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {leading && <div className={styles.headerLeading}>{leading}</div>}
      {title && (
        <h1 className={styles.headerTitle} title={title}>
          {onTitleClick ? (
            <button
              type="button"
              className={styles.headerTitleButton}
              aria-label={titleActionLabel}
              onClick={onTitleClick}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h1>
      )}
      {center && <div className={styles.headerCenter}>{center}</div>}
      {trailing && <div className={styles.headerTrailing}>{trailing}</div>}
    </header>
  )
}

interface HeaderIconLinkProps extends LinkProps {
  label: string
}

export function HeaderIconLink({
  label,
  children,
  ...rest
}: HeaderIconLinkProps) {
  return (
    <Link
      className={styles.headerIconLink}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </Link>
  )
}

interface HeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export function HeaderIconButton({
  label,
  children,
  type = 'button',
  ...rest
}: HeaderIconButtonProps) {
  return (
    <button
      type={type}
      className={styles.headerIconLink}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}

interface MenuItem {
  label: string
  to?: string
  onClick?: () => void
  icon?: ReactNode
}

interface HeaderMenuProps {
  label: string
  items: MenuItem[]
  extra?: ReactNode
  // Línea fija arriba del menú (por ejemplo, con qué usuario se inició sesión).
  headingTo?: string
  heading?: ReactNode
}

export function HeaderMenu({
  label,
  items,
  extra,
  heading,
  headingTo,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function renderItem(item: MenuItem) {
    const content = (
      <>
        {item.icon && (
          <span className={styles.headerMenuIcon}>{item.icon}</span>
        )}
        <span>{item.label}</span>
      </>
    )
    const className = styles.headerMenuItem
    if (item.to) {
      return (
        <Link
          key={item.label}
          to={item.to}
          className={className}
          onClick={() => setOpen(false)}
        >
          {content}
        </Link>
      )
    }
    return (
      <button
        key={item.label}
        type="button"
        className={className}
        onClick={() => {
          setOpen(false)
          item.onClick?.()
        }}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={styles.headerMenu} ref={containerRef}>
      <HeaderIconButton
        label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon />
      </HeaderIconButton>
      {open && (
        <nav className={styles.headerMenuPanel} aria-label={label}>
          {heading &&
            (headingTo ? (
              <Link
                to={headingTo}
                className={styles.headerMenuItem}
                onClick={() => setOpen(false)}
              >
                {heading}
              </Link>
            ) : (
              <p className={styles.headerMenuHeading}>{heading}</p>
            ))}
          {items.map(renderItem)}
          {extra}
        </nav>
      )}
    </div>
  )
}

interface TabOption<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  label: string
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function Tabs<T extends string>({
  label,
  options,
  value,
  onChange,
}: TabsProps<T>) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? styles.tabActive : styles.tab}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SectionTitleProps {
  children: ReactNode
}

export function SectionTitle({ children }: SectionTitleProps) {
  return <h2 className={styles.sectionTitle}>{children}</h2>
}

interface PanelProps {
  children: ReactNode
}

export function Panel({ children }: PanelProps) {
  return <div className={styles.panel}>{children}</div>
}

interface PanelHeaderProps {
  id?: string
  children: ReactNode
}

export function PanelHeader({ id, children }: PanelHeaderProps) {
  return (
    <h2 id={id} className={styles.panelHeader}>
      {children}
    </h2>
  )
}

interface PanelLinkProps extends LinkProps {
  header: ReactNode
  meta?: ReactNode
}

export function PanelLink({
  header,
  meta,
  className,
  ...rest
}: PanelLinkProps) {
  return (
    <Link className={cx(styles.panelLink, className)} {...rest}>
      <span className={styles.panel}>
        <span className={styles.panelHeader}>{header}</span>
        {meta !== undefined && <span className={styles.panelMeta}>{meta}</span>}
      </span>
    </Link>
  )
}

interface RowsProps {
  children: ReactNode
}

export function Rows({ children }: RowsProps) {
  return <div className={styles.rows}>{children}</div>
}

interface StatRowProps {
  label: string
  value: ReactNode
}

export function StatRow({ label, value }: StatRowProps) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

interface SectionProps {
  title?: string
  // Botón "?" en el título que abre una explicación breve.
  help?: { label: string; onClick: () => void }
  children: ReactNode
}

export function Section({ title, help, children }: SectionProps) {
  return (
    <section className={styles.section}>
      {title && (
        <h2 className={styles.sectionHead}>
          {title}
          {help && (
            <button
              type="button"
              className={styles.sectionHelp}
              aria-label={help.label}
              onClick={help.onClick}
            >
              <span className={styles.sectionHelpMark} aria-hidden="true">
                ?
              </span>
            </button>
          )}
        </h2>
      )}
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

interface FigureProps {
  value: ReactNode
  label: string
}

// Una cifra principal: bloque negro con el número grande en crema y su etiqueta.
export function Figure({ value, label }: FigureProps) {
  return (
    <div className={styles.figure}>
      <span className={styles.figureValue}>{value}</span>
      <span className={styles.figureLabel}>{label}</span>
    </div>
  )
}

// Reparte varias cifras en bloques del mismo ancho.
export function Figures({ children }: { children: ReactNode }) {
  return <div className={styles.figures}>{children}</div>
}

interface EmptyNoteProps {
  children: ReactNode
}

export function EmptyNote({ children }: EmptyNoteProps) {
  return <p className={styles.emptyNote}>{children}</p>
}

export function Notice({ children }: EmptyNoteProps) {
  return (
    <p className={styles.notice} role="alert">
      {children}
    </p>
  )
}

interface StatLinkProps extends LinkProps {
  label: string
  value: ReactNode
}

export function StatLink({ label, value, className, ...rest }: StatLinkProps) {
  return (
    <Link className={cx(styles.statRow, styles.statLink, className)} {...rest}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </Link>
  )
}

interface AvatarProps {
  name: string
  color: string
  src?: string | null
  size?: number
}

export function Avatar({ name, color, src, size = 40 }: AvatarProps) {
  if (src) {
    return (
      <img
        className={cx(styles.avatar, styles.avatarPhoto)}
        src={src}
        alt={name}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className={styles.avatar}
      role="img"
      aria-label={name}
      style={{ width: size, height: size, background: color }}
    >
      <AvatarSilhouette size={Math.round(size * 0.62)} />
    </span>
  )
}

interface AvatarStackProps {
  members: Array<{
    id: string
    name: string
    color: string
    src?: string | null
  }>
  size?: number
}

// Varios avatares superpuestos, para mostrar un equipo o un par en poco espacio.
export function AvatarStack({ members, size = 32 }: AvatarStackProps) {
  return (
    <span className={styles.avatarStack}>
      {members.map((member) => (
        <span key={member.id} className={styles.avatarStackItem}>
          <Avatar
            name={member.name}
            color={member.color}
            src={member.src}
            size={size}
          />
        </span>
      ))}
    </span>
  )
}

interface WinRateRingProps {
  percent: number
  color: string
  size?: number
  caption?: string
  label?: string
}

export function WinRateRing({
  percent,
  color,
  size = 72,
  caption,
  label,
}: WinRateRingProps) {
  const value = Math.min(100, Math.max(0, percent))
  const stroke = Math.max(4, Math.round(size * 0.09))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (value / 100) * circumference

  return (
    <div
      className={styles.ring}
      role="img"
      aria-label={`${Math.round(value)}% de victorias`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={styles.ringValue} style={{ fontSize: size * 0.28 }}>
        {label ?? `${Math.round(value)}%`}
      </span>
      {caption && <span className={styles.ringCaption}>{caption}</span>}
    </div>
  )
}

interface FieldLabelProps {
  children: ReactNode
}

export function FieldLabel({ children }: FieldLabelProps) {
  return <span className={styles.fieldLabel}>{children}</span>
}

interface FieldProps {
  label: string
  inline?: boolean
  children: ReactNode
}

export function Field({ label, inline = false, children }: FieldProps) {
  return (
    <label className={cx(styles.field, inline && styles.fieldInline)}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  )
}

export function TextInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(styles.input, className)} {...rest} />
}

interface StepperProps {
  value: number
  min?: number
  max?: number
  decreaseLabel: string
  increaseLabel: string
  onDecrease: () => void
  onIncrease: () => void
}

export function Stepper({
  value,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  decreaseLabel,
  increaseLabel,
  onDecrease,
  onIncrease,
}: StepperProps) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.stepButton}
        onClick={onDecrease}
        disabled={value <= min}
        aria-label={decreaseLabel}
      >
        −
      </button>
      <span className={styles.stepValue}>{value}</span>
      <button
        type="button"
        className={styles.stepButton}
        onClick={onIncrease}
        disabled={value >= max}
        aria-label={increaseLabel}
      >
        +
      </button>
    </div>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'inverse'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], className)}
      {...rest}
    />
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cx(styles.button, styles[variant], className)} {...rest} />
  )
}

interface CardLinkProps extends LinkProps {
  meta?: ReactNode
  chevron?: boolean
}

export function CardLink({
  meta,
  chevron = true,
  className,
  children,
  ...rest
}: CardLinkProps) {
  return (
    <Link className={cx(styles.card, className)} {...rest}>
      <span className={styles.cardBody}>
        <span className={styles.cardTitle}>{children}</span>
        {meta !== undefined && <span className={styles.cardMeta}>{meta}</span>}
      </span>
      {chevron && (
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      )}
    </Link>
  )
}

interface ScreenFooterProps {
  children: ReactNode
}

export function ScreenFooter({ children }: ScreenFooterProps) {
  return <footer className={styles.footer}>{children}</footer>
}

interface DialogProps {
  title: string
  onClose: () => void
  // Muestra una X arriba a la derecha para cerrarlo; sirve para mensajes que
  // no necesitan botones.
  closeButton?: boolean
  children?: ReactNode
}

// Diálogo modal superpuesto: título negro y contenido. Escape lo cierra.
export function Dialog({
  title,
  onClose,
  closeButton = false,
  children,
}: DialogProps) {
  const titleId = useId()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {closeButton ? (
          <div className={styles.dialogHeadRow}>
            <PanelHeader id={titleId}>{title}</PanelHeader>
            <button
              type="button"
              className={styles.dialogClose}
              aria-label="Cerrar"
              onClick={onClose}
            >
              <CloseIcon size={20} />
            </button>
          </div>
        ) : (
          <PanelHeader id={titleId}>{title}</PanelHeader>
        )}
        {children && <div className={styles.confirmActions}>{children}</div>}
      </div>
    </div>
  )
}

// Parte de la pantalla donde se ve un elemento: la ventana, recortada por los
// contenedores con desplazamiento que lo rodean (lo que sale de ellos no se ve).
function visibleArea(element: HTMLElement): { top: number; bottom: number } {
  let top = 0
  let bottom = window.innerHeight
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const { overflowY } = getComputedStyle(parent)
    if (overflowY !== 'visible') {
      const rect = parent.getBoundingClientRect()
      top = Math.max(top, rect.top)
      bottom = Math.min(bottom, rect.bottom)
    }
  }
  return { top, bottom }
}

interface OverflowMenuProps {
  label: string
  items: { label: string; onClick: () => void }[]
}

// Botón de tres puntos con un menú de opciones, para acciones por fila. Se
// cierra al elegir una opción, al tocar afuera o con Escape.
export function OverflowMenu({ label, items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  // Si abajo no hay lugar (por ejemplo, en la última fila), se abre hacia arriba.
  const [upward, setUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const container = containerRef.current
    if (!open || !panel || !container) {
      setUpward(false)
      return
    }
    const area = visibleArea(container)
    const button = container.getBoundingClientRect()
    const height = panel.offsetHeight
    const below = area.bottom - button.bottom
    const above = button.top - area.top
    setUpward(below < height && above > below)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={styles.overflow}>
      <button
        type="button"
        className={styles.overflowButton}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <DotsIcon size={20} />
      </button>
      {open && (
        <div
          ref={panelRef}
          className={cx(styles.overflowPanel, upward && styles.overflowPanelUp)}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={styles.overflowItem}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  confirmLabel = 'Sí',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <Button onClick={onConfirm}>{confirmLabel}</Button>
      <Button variant="secondary" autoFocus onClick={onCancel}>
        {cancelLabel}
      </Button>
    </Dialog>
  )
}

interface ScreenProps {
  children: ReactNode
}

export function Screen({ children }: ScreenProps) {
  return <div className={styles.screen}>{children}</div>
}

interface ScreenContentProps {
  children: ReactNode
  flush?: boolean
}

export function ScreenContent({ children, flush = false }: ScreenContentProps) {
  return (
    <main className={cx(styles.content, flush && styles.contentFlush)}>
      {children}
    </main>
  )
}
