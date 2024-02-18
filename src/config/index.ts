import 'dotenv/config'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

// the defaults work for tests. you should define your own
// either via .env file, or via environment variables directly (depends on your setup)

// server base url, e.g. to construct correct email verification links
export const baseUrl = process.env.BASE_URL ?? 'http://localhost:3005'

export const appName = process.env.APP_NAME ?? 'sleepy.bike'

// identity under which the mailer is operating
export const mailerCredentials = {
  email: process.env.MAILER_IDENTITY_EMAIL ?? 'bot@example',
  password: process.env.MAILER_IDENTITY_PASSWORD ?? 'password',
  provider: process.env.MAILER_IDENTITY_PROVIDER ?? 'http://localhost:3456',
  webId:
    process.env.MAILER_IDENTITY_WEBID ??
    'http://localhost:3456/bot/profile/card#me',
  // version of CommunitySolidServer that provides identity for mailer
  cssVersion: <6 | 7>+(process.env.MAILER_IDENTITY_CSS_VERSION ?? 7), // 6 or 7
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
export const emailSender =
  process.env.EMAIL_SENDER ?? 'noreply@notifications.sleepy.bike'

export const port: number = +(process.env.PORT ?? 3005)

// email verification expiration in seconds (1 hour)
export const emailVerificationExpiration = 3600

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

export const emailDiscoveryType =
  process.env.EMAIL_DISCOVERY_TYPE ??
  'http://w3id.org/hospex/ns#PersonalHospexDocument'

export const verificationTokenPredicate =
  'https://example.com/emailVerificationToken'
