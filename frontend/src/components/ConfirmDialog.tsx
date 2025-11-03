import React from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantClasses = {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const classes = variantClasses[variant];
  const iconBgColor =
    variant === 'danger'
      ? 'bg-red-100'
      : variant === 'warning'
        ? 'bg-yellow-100'
        : 'bg-blue-100';

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200'>
        <div className='p-6'>
          <div className='flex items-start'>
            <div
              className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconBgColor}`}
            >
              <ExclamationTriangleIcon
                className={`h-6 w-6 ${classes.icon}`}
                aria-hidden='true'
              />
            </div>
            <div className='ml-4 flex-1'>
              <h3 className='text-lg font-semibold text-gray-900'>{title}</h3>
              <div className='mt-2'>
                <p className='text-sm text-gray-500'>{message}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className='ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors'
            >
              <XMarkIcon className='h-5 w-5' />
            </button>
          </div>
          <div className='mt-6 flex justify-end space-x-3'>
            <button
              onClick={onCancel}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors'
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                variant === 'danger'
                  ? 'focus:ring-red-500'
                  : variant === 'warning'
                    ? 'focus:ring-yellow-500'
                    : 'focus:ring-blue-500'
              } transition-colors ${classes.button}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
