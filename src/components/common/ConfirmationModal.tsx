import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  isLoading = false
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconColor: 'text-red-400',
          confirmButtonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          borderColor: 'border-red-500'
        }
      case 'warning':
        return {
          iconColor: 'text-yellow-400',
          confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          borderColor: 'border-yellow-500'
        }
      case 'info':
        return {
          iconColor: 'text-blue-400',
          confirmButtonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          borderColor: 'border-blue-500'
        }
      default:
        return {
          iconColor: 'text-yellow-400',
          confirmButtonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          borderColor: 'border-yellow-500'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative bg-gray-800 rounded-lg shadow-xl p-4 sm:p-8 md:p-6 lg:p-6 w-full max-w-md mx-4 border ${styles.borderColor}`}
          >
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${styles.iconColor}`}>
                <FaExclamationTriangle className="h-6 w-6" />
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-base sm:text-xl md:text-lg font-medium text-white mb-2">
                  {title}
                </h3>
                <p className="text-sm sm:text-base md:text-sm text-gray-300 mb-4">
                  {message}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm sm:text-base md:text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px] sm:min-h-[48px] md:min-h-[44px]"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm sm:text-base md:text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[48px] md:min-h-[44px] ${styles.confirmButtonColor}`}
                    onClick={onConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                onClick={onClose}
                disabled={isLoading}
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmationModal