import React, { forwardRef } from 'react'
import { motion, type MotionProps } from 'framer-motion'
import clsx from 'clsx'

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof MotionProps> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: React.ReactNode
}

const buttonVariants = {
  primary: 'bg-brand-primary-500 text-white hover:bg-brand-primary-600 focus:ring-brand-primary-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
}

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    const variantClasses = buttonVariants[variant]
    const sizeClasses = buttonSizes[size]
    const widthClass = fullWidth ? 'w-full' : ''

    const iconSpacing = iconPosition === 'left' ? 'mr-2' : 'ml-2'

    return (
      <motion.button
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses,
          sizeClasses,
          widthClass,
          className
        )}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {icon && iconPosition === 'left' && !loading && (
          <span className={iconSpacing}>{icon}</span>
        )}

        <span>{children}</span>

        {icon && iconPosition === 'right' && (
          <span className={iconSpacing}>{icon}</span>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'