import { expect } from 'chai'
import * as cheerio from 'cheerio'
import { createAccount } from 'css-authn/dist/7.x'
import { createSandbox } from 'sinon'
import { v4 as uuidv4 } from 'uuid'
import * as config from '../../config'
import * as mailerService from '../../services/mailerService'
import { setupEmailSettings } from './setupPod'
import { Person } from './types'

export const createRandomAccount = ({
  solidServer,
}: {
  solidServer: string
}) => {
  return createAccount({
    username: uuidv4(),
    password: uuidv4(),
    email: uuidv4() + '@example.com',
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
  const sandbox = createSandbox()
  const sendMailSpy = sandbox.spy(mailerService, 'sendMail')
  const initResponse = await authenticatedFetch(`${config.baseUrl}/init`, {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  expect(initResponse.status).to.equal(200)
  // email was sent
  const emailMessage = sendMailSpy.firstCall.firstArg.html
  const $ = cheerio.load(emailMessage)
  const verificationLink = $('a').first().attr('href') as string
  expect(verificationLink).to.not.be.null
  sandbox.restore()

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

  const { token } = await finishIntegration(verificationLink)

  return token
}
