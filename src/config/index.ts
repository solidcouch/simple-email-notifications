import 'dotenv/config'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

// the defaults work for tests. you should define your own
// either via .env file, or via environment variables directly (depends on your setup)

// server base url, e.g. to construct correct email verification links
export const baseUrl = process.env.BASE_URL ?? 'http://localhost:3005'

// identity under which the mailer is operating
export const mailerCredentials = {
  email: process.env.MAILER_IDENTITY_EMAIL ?? 'bot@example',
  password: process.env.MAILER_IDENTITY_PASSWORD ?? 'password',
  solidServer: process.env.MAILER_IDENTITY_PROVIDER ?? 'http://localhost:3456',
}

const stringToBoolean = (value: string | undefined): boolean => {
  if (value === 'false') return false
  if (value === '0') return false
  return !!value
}
// SMTP transport for nodemailer (setup for sending emails)
export const smtpTransportOptions: SMTPTransport.Options = {
  host: process.env.SMTP_TRANSPORT_HOST || undefined,
  port: process.env.SMTP_TRANSPORT_PORT
    ? +process.env.SMTP_TRANSPORT_PORT
    : 1025, // default works for maildev
  secure: stringToBoolean(process.env.SMTP_TRANSPORT_SECURE),
  auth: {
    user: process.env.SMTP_TRANSPORT_AUTH_USER || undefined,
    pass: process.env.SMTP_TRANSPORT_AUTH_PASS || undefined,
  },
  requireTLS: stringToBoolean(process.env.STP_TRANSPORT_REQUIRE_TLS),
}

// email address which will be the sender of the notifications and email verification messages
export const emailSender = process.env.EMAIL_SENDER

export const port: number = +(process.env.PORT ?? 3005)

// email verification expiration in milliseconds (1 hour)
export const emailVerificationExpiration = 3600 * 1000
