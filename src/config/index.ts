import 'dotenv/config'

// the defaults work for tests. you should define your own
// either via .env file, or via environment variables directly (depends on your setup)

// server base url, e.g. to construct correct email verification links
export const baseUrl = process.env.BASE_URL ?? 'http://localhost:3005'

export const mailerCredentials = {
  email: process.env.MAILER_IDENTITY_EMAIL ?? 'bot@example',
  password: process.env.MAILER_IDENTITY_PASSWORD ?? 'password',
  solidServer: process.env.MAILER_IDENTITY_PROVIDER ?? 'http://localhost:3456',
}

export const port: number = +(process.env.PORT ?? 3005)

// email verification expiration in milliseconds (1 hour)
export const emailVerificationExpiration = 3600 * 1000
