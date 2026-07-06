import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export default function Card({ children, className = '', title, action }: CardProps) {
  return (
    <div className={`bg-dark-900 border border-dark-700 rounded-xl ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
