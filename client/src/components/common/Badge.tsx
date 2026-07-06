const variants = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  neutral: 'bg-dark-700 text-dark-300 border-dark-600',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}

export default function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
