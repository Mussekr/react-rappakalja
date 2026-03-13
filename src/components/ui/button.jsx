import { cn } from '../../lib/utils';

function Button({ className, variant = 'default', size = 'default', ...props }) {
    const variants = {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
    };

    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-sm',
        lg: 'h-12 px-6 text-lg',
    };

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-md font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                'disabled:pointer-events-none disabled:opacity-50',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}

export { Button };
