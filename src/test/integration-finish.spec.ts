import { expect } from 'chai'
import * as cheerio from 'cheerio'
import fetch from 'cross-fetch'
import { describe } from 'mocha'
import Mail from 'nodemailer/lib/mailer'
import { SinonSandbox, SinonSpy, createSandbox } from 'sinon'
import { baseUrl } from '../config'
import * as mailerService from '../services/mailerService'
import { authenticatedFetch } from './testSetup.spec'

describe('email verification via /verify-email?token=jwt', () => {
  let sendMailSpy: SinonSpy<[options: Mail.Options], Promise<void>>
  let verificationLink: string
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = createSandbox()
    sendMailSpy = sandbox.spy(mailerService, 'sendMail')
    sandbox.useFakeTimers({ now: Date.now(), toFake: ['Date'] })
  })

  afterEach(() => {
    sandbox.restore()
  })

  beforeEach(async () => {
    // initialize the integration
    const initResponse = await authenticatedFetch(`${baseUrl}/init`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'email@example.com' }),
    })

    expect(initResponse.status).to.equal(200)
    // email was sent
    const emailMessage = sendMailSpy.firstCall.firstArg.html
    const $ = cheerio.load(emailMessage)
    verificationLink = $('a').first().attr('href') as string
    expect(verificationLink).to.not.be.null
  })

  it('[correct token] should respond with 200', async () => {
    const response = await fetch(verificationLink)
    expect(response.status).to.equal(200)
  })

  it(
    '[correct token] should return proof of verification for the user to save on their pod, or edit the pod directly',
  )
  // this is a JWT token, it keeps email and webId of the person as payload

  it('[incorrect token] should respond with 400', async () => {
    const response = await fetch(
      verificationLink.slice(0, -32) + '0'.repeat(32),
    )
    expect(response.status).to.equal(400)
    expect(await response.text()).to.equal('Verification link is invalid')
  })

  it('[missing token] should respond with 400', async () => {
    const response = await fetch(`${baseUrl}/verify-email`)
    expect(response.status).to.equal(400)
    expect(await response.text()).to.equal(
      'This is not a valid verification link. Have you received the link in your email?',
    )
  })

  it('[expired token] should respond with 400', async () => {
    sandbox.clock.tick(3601 * 1000)
    const response = await fetch(verificationLink)
    // wait one hour and one second
    expect(response.status).to.equal(400)
    expect(await response.text()).to.equal('Verification link is expired')
  })
})
