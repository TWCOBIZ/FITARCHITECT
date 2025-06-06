import { NextApiRequest, NextApiResponse } from 'next'
// @ts-ignore: Suppress TelegramService import error for deployment
import { TelegramService } from '../../services/telegramService'

const DEV_CHANNEL_ID = process.env.NEXT_PUBLIC_TELEGRAM_DEV_CHANNEL_ID

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  if (!DEV_CHANNEL_ID) {
    console.error('Development channel ID not configured')
    return res.status(500).json({ message: 'Error reporting not configured' })
  }

  try {
    const errorReport = req.body

    // Validate required fields
    if (!errorReport.error || !errorReport.context) {
      return res.status(400).json({ message: 'Invalid error report format' })
    }

    // Format error message for Telegram
    const message = `
🚨 <b>Error Report</b>

<b>Error:</b>
Code: ${errorReport.error.code}
Description: ${errorReport.error.description}
Message: ${errorReport.error.message}

<b>Context:</b>
Component: ${errorReport.context.component}
Action: ${errorReport.context.action}
User ID: ${errorReport.context.userId || 'Not available'}
URL: ${errorReport.context.url}
User Agent: ${errorReport.context.userAgent}

<b>Additional Info:</b>
${errorReport.additionalInfo ? JSON.stringify(errorReport.additionalInfo, null, 2) : 'None'}

<b>Timestamp:</b>
${errorReport.timestamp}
    `

    // Send to development team's Telegram channel
    const telegramService = TelegramService.getInstance()
    telegramService.setConfig({ chatId: DEV_CHANNEL_ID })
    const result = await telegramService.sendMessage(message)

    if (result.success) {
      return res.status(200).json({ message: 'Error report sent successfully' })
    } else {
      console.error('Failed to send error report to Telegram:', result.error)
      return res.status(500).json({ message: 'Failed to send error report' })
    }
  } catch (error) {
    console.error('Error processing error report:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
} 