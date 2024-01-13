import 'dotenv/config'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import { Dialect, Options } from 'sequelize'

// the defaults work for tests. you should define your own
// either via .env file, or via environment variables directly (depends on your setup)

// server base url, e.g. to construct correct email verification links
export const baseUrl = process.env.BASE_URL ?? 'http://localhost:3005'

// identity under which the mailer is operating
export const mailerCredentials = {
  email: process.env.MAILER_IDENTITY_EMAIL ?? 'bot@example',
  password: process.env.MAILER_IDENTITY_PASSWORD ?? 'password',
  provider: process.env.MAILER_IDENTITY_PROVIDER ?? 'http://localhost:3456',
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

// email verification expiration in seconds (1 hour)
export const emailVerificationExpiration = 3600

// configuration of database in form of sequelize options
export const database: Options = {
  dialect: (process.env.DB_DIALECT as Dialect) ?? 'sqlite',
  storage: process.env.DB_STORAGE || undefined, // Path to the SQLite database file (default is memory)
  database: process.env.DB_DATABASE || undefined,
  username: process.env.DB_USERNAME || undefined,
  password: process.env.DB_PASSWORD || undefined,
  host: process.env.DB_HOST || undefined,
  port: process.env.DB_PORT ? +process.env.DB_PORT : undefined,
}

export const isBehindProxy = stringToBoolean(process.env.BEHIND_PROXY)

const stringToArray = (value: string | undefined) => {
  if (!value) return []
  return value.split(/\s*,\s*/)
}

export const allowedGroups = stringToArray(
  process.env.ALLOWED_GROUPS ?? 'https://example.com#us',
)

export const jwt = {
  key: process.env.JWT_KEY ?? './ecdsa-p256-private.pem',
  alg: process.env.JWT_ALG ?? 'ES256',
}
