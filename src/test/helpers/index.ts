import * as cheerio from 'cheerio'
import { createAccount } from 'css-authn/dist/7.x.js'
import { randomUUID } from 'node:crypto'
import * as puppeteer from 'puppeteer'
import { expect, vi } from 'vitest'
import * as config from '../../config/index.js'
import * as mailerService from '../../services/mailerService.js'
import { setupEmailSettings } from './setupPod.js'
import { Person } from './types.js'

export const createRandomAccount = ({
  solidServer,
}: {
  solidServer: string
}) => {
  return createAccount({
    username: randomUUID(),
    password: randomUUID(),
    email: randomUUID() + '@example.com',
    provider: solidServer,
  })
}

export const initIntegration = async ({
  email,
  authenticatedFetch,
}: {
  email: string
  authenticatedFetch: typeof fetch
}) => {
  const sendMailSpy = vi.spyOn(mailerService, 'sendMail')
  const initResponse = await authenticatedFetch(`${config.baseUrl}/init`, {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  expect(initResponse.status).to.equal(200)
  // email was sent
  const emailMessage = sendMailSpy.mock.calls[0][0].html as string
  expect(emailMessage).toBeDefined()
  const $ = cheerio.load(emailMessage as string)
  const verificationLink = $('a').first().attr('href')
  expect(verificationLink).to.not.be.null
  vi.restoreAllMocks()

  return { verificationLink }
}

const finishIntegration = async (verificationLink: string) => {
  const response = await fetch(verificationLink)
  expect(response.ok).to.be.true
  const jwt = await response.text()
  return { token: jwt }
}

export const verifyEmail = async ({
  email,
  person,
  authenticatedFetch,
}: {
  email: string
  person: Person
  authenticatedFetch: typeof fetch
}) => {
  await setupEmailSettings({
    person,
    email: '',
    emailVerificationToken: '',
    authenticatedFetch,
    skipSettings: true,
  })

  const { verificationLink } = await initIntegration({
    email,
    authenticatedFetch,
  })

  expect(verificationLink).toBeDefined()

  const { token } = await finishIntegration(verificationLink!)

  return token
}

export const takeScreenshot = async (email: { html: string }, name: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  })

  const page = await browser.newPage()
  await page.setContent(email.html)
  await page.screenshot({ path: `screenshots/${name}.png` })

  await browser.close()
}
