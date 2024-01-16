import { expect } from 'chai'
import * as cheerio from 'cheerio'
import { createAccount } from 'css-authn/dist/7.x'
import { createSandbox } from 'sinon'
import * as uuid from 'uuid'
import * as config from '../../config'
import * as mailerService from '../../services/mailerService'

export const createRandomAccount = ({
  solidServer,
}: {
  solidServer: string
}) => {
  return createAccount({
    username: uuid.v4(),
    password: uuid.v4(),
    email: uuid.v4() + '@example.com',
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

export const finishIntegration = async (verificationLink: string) => {
  const response = await fetch(verificationLink)
  expect(response.ok).to.be.true
  const jwt = await response.text()
  return { token: jwt }
}

export const verifyEmail = async ({
  email,
  authenticatedFetch,
}: {
  email: string
  authenticatedFetch: typeof fetch
}) => {
  const { verificationLink } = await initIntegration({
    email,
    authenticatedFetch,
  })
  const { token } = await finishIntegration(verificationLink)

  return token
}
