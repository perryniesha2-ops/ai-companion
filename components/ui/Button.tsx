import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  children: ReactNode;
};

export default function Button({ loading = false, className, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={loading || disabled}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium',
        'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
}
