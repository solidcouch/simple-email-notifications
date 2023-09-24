import { expect } from 'chai'
import * as cheerio from 'cheerio'
import { describe } from 'mocha'
import Mail from 'nodemailer/lib/mailer'
import { SinonSandbox, SinonSpy, createSandbox } from 'sinon'
import { baseUrl } from '../config'
import * as mailerService from '../services/mailerService'
import { authenticatedFetch } from './testSetup.spec'

describe('email verification via /verify-email?id=webId&token=base64Token', () => {
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
    const initResponse = await authenticatedFetch(`${baseUrl}/inbox`, {
      method: 'post',
      headers: {
        'content-type':
          'application/ld+json;profile="https://www.w3.org/ns/activitystreams"',
      },
      body: JSON.stringify({
        '@context': 'https://www.w3.org/ns/activitystreams',
        '@id': '',
        '@type': 'Add',
        actor: 'http://localhost:3456/person/profile/card#me',
        object: 'http://localhost:3456/person/profile/card',
        target: 'email@example.com',
      }),
    })

    expect(initResponse.status).to.equal(200)
    // email was sent
    const emailMessage = sendMailSpy.firstCall.firstArg.html
    const $ = cheerio.load(emailMessage)
    verificationLink = $('a').first().attr('href') as string
    expect(verificationLink).to.not.be.null
  })

  it('[correct token] should finish the integration of webId + inbox + email and respond 200', async () => {
    const response = await fetch(verificationLink)
    expect(response.status).to.equal(200)
  })

  it('[incorrect token] should respond with 400', async () => {
    const response = await fetch(verificationLink.slice(0, -2))
    expect(response.status).to.equal(400)
    expect(await response.text()).to.equal('Verification link is invalid')
  })

  it('[integration for webId not started] should respond with 400', async () => {
    const response = await fetch(
      `${baseUrl}/verify-email?id=asdf&token=12345678`,
    )
    expect(response.status).to.equal(400)
    expect(await response.text()).to.equal('Verification link is invalid')
  })

  it('[missing id or token] should respond with 400', async () => {
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

  it('when we send out multiple verification emails, the last link should work')
})
