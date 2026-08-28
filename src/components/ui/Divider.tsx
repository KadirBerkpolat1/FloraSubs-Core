import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'dashed';
}

export const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  (
    {
      className,
      orientation = 'horizontal',
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'bg-outline-variant/40 border-0';

    const orientations = {
      horizontal: 'w-full h-px',
      vertical: 'h-full w-px',
    };

    const variants = {
      default: '',
      dashed: 'bg-transparent border-t border-outline-variant/40 border-dashed',
    };

    return (
      <hr
        ref={ref}
        className={twMerge(baseStyles, orientations[orientation], variants[variant], className)}
        role="separator"
        aria-orientation={orientation}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';