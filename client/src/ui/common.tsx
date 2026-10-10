import React, { useEffect, useRef } from 'react';
import { audio } from '../lib/audio';
import { useStore } from '../lib/store';

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'good' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  silent?: boolean;
};

export function Btn({
  variant = 'default', size = 'md', block, silent, className = '', onClick, children, ...rest
}: BtnProps) {
  const cls = [
    'btn',
    variant !== 'default' ? 'btn-' + variant : '',
    size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      onClick={(e) => {
        if (!silent) audio.click();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <div className="loading-veil">
      <div className="loader" />
      {label ? <p className="muted">{label}</p> : null}
    </div>
  );
}

export function Bar({ value, max, tone }: { value: number; max: number; tone?: 'good' | 'xp' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={'bar' + (tone ? ' bar-' + tone : '')}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <span style={{ width: pct + '%' }} />
    </div>
  );
}

export function Modal({
  children, onClose, wide, labelledBy,
}: {
  children: React.ReactNode;
  onClose?: () => void;
  wide?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    // Focus the dialog so screen readers announce it and Esc works right away.
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== 'Tab' || !ref.current) return;
      // Keep keyboard focus inside the dialog.
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div
        className={'modal' + (wide ? ' modal-wide' : '')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={ref}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={'toast toast-' + t.tone}>
          {t.icon ? <span aria-hidden="true">{t.icon}</span> : null}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Chip({
  children, tone, title,
}: { children: React.ReactNode; tone?: 'xp' | 'coin' | 'star' | 'good' | 'bad'; title?: string }) {
  return <span className={'chip' + (tone ? ' chip-' + tone : '')} title={title}>{children}</span>;
}

export function ScreenHeader({
  title, subtitle, onBack, right,
}: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="between shell" style={{ width: '100%' }}>
      <div className="row" style={{ minWidth: 0 }}>
        {onBack ? (
          <Btn onClick={onBack} aria-label="Go back" className="btn-icon">←</Btn>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ marginBottom: subtitle ? 2 : 0 }}>{title}</h1>
          {subtitle ? <div className="muted tiny">{subtitle}</div> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

/** Number of stars as a readable string plus visual. */
export function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span aria-label={count + ' out of ' + max + ' stars'}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} aria-hidden="true" style={{ opacity: i < count ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}
