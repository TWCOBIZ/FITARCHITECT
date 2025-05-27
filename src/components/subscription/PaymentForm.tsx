import React, { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { LoadingLogo } from '../common/LoadingLogo'

interface PaymentFormProps {
  planName: string
  amount: number
  planId: string
  onSuccess: () => void
  onError: (error: string) => void
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  planName,
  amount,
  planId,
  onSuccess,
  onError
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      })

      if (paymentMethodError) {
        setErrorMessage(paymentMethodError.message || 'An error occurred')
        onError(paymentMethodError.message || 'An error occurred')
        return
      }

      // Create subscription on the backend
      const response = await fetch('http://localhost:3001/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          planId,
        }),
      })

      const subscription = await response.json()

      if (subscription.error) {
        setErrorMessage(subscription.error)
        onError(subscription.error)
        return
      }

      // Confirm the payment
      const { error: confirmError } = await stripe.confirmCardPayment(
        subscription.clientSecret
      )

      if (confirmError) {
        setErrorMessage(confirmError.message || 'An error occurred')
        onError(confirmError.message || 'An error occurred')
        return
      }

      onSuccess()
    } catch (err) {
      setErrorMessage('An unexpected error occurred')
      onError('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="card-element" className="block text-sm font-medium text-gray-300">
            Card details
          </label>
          <div className="mt-1">
            <CardElement
              id="card-element"
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#ffffff',
                    '::placeholder': {
                      color: '#aab7c4'
                    }
                  },
                  invalid: {
                    color: '#fa755a',
                    iconColor: '#fa755a'
                  }
                }
              }}
              className="p-3 bg-gray-800 rounded-md"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="text-red-500 text-sm">{errorMessage}</div>
        )}

        <div className="text-sm text-gray-400">
          <p>You will be charged ${amount} for the {planName} plan</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <span className="flex items-center">
            <LoadingLogo size="sm" className="mr-2" />
            Processing...
          </span>
        ) : (
          `Pay $${amount}`
        )}
      </button>
    </form>
  )
} 