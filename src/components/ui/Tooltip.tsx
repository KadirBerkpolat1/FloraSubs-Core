import React, { useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrows = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-white',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-white',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-white',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-white',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const childProps = {
    onMouseEnter: showTooltip,
    onMouseLeave: hideTooltip,
    onFocus: showTooltip,
    onBlur: hideTooltip,
  };

  const childWithProps = React.cloneElement(children, childProps);

  if (!isVisible) return childWithProps;

  const tooltip = (
    <div
      className={twMerge(
        'fixed z-50 px-2.5 py-1.5 text-[11px] font-mono text-white bg-surface-container-highest border border-outline-variant rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 duration-150',
        positions[position]
      )}
      style={{ transformOrigin: position === 'left' ? 'right' : position === 'right' ? 'left' : 'center' }}
      role="tooltip"
    >
      {content}
      <div
        className={twMerge(
          'absolute w-0 h-0 border-4 border-transparent',
          arrows[position]
        )}
      />
    </div>
  );

  return (
    <>
      {childWithProps}
      {createPortal(tooltip, document.body)}
    </>
  );
};