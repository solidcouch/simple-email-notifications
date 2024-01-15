import { expect } from 'chai'
import fetch from 'cross-fetch'
import { describe } from 'mocha'
import Mail from 'nodemailer/lib/mailer'
import { SinonSandbox, SinonSpy, createSandbox } from 'sinon'
import { baseUrl } from '../config'
import * as mailerService from '../services/mailerService'
import { authenticatedFetch, otherAuthenticatedFetch } from './testSetup.spec'

describe('Initialize email integration via /init', () => {
  let sendMailSpy: SinonSpy<[options: Mail.Options], Promise<void>>
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = createSandbox()
    sendMailSpy = sandbox.spy(mailerService, 'sendMail')
  })

  afterEach(() => {
    sandbox.restore()
  })

  context('everything ok', () => {
    let response: Response
    beforeEach(async () => {
      response = await authenticatedFetch(`${baseUrl}/init`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'email@example.com' }),
      })
    })

    it('should be able to receive integration request to /init', async () => {
      expect(response.status).to.equal(200)
    })

    it('should send email with verification link', async () => {
      expect(sendMailSpy.calledOnce).to.be.true
      expect(sendMailSpy.firstCall.firstArg).to.haveOwnProperty(
        'to',
        'email@example.com',
      )
      expect(sendMailSpy.firstCall.firstArg)
        .to.haveOwnProperty('text')
        .include(`verify-email?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.`)
      expect(sendMailSpy.firstCall.firstArg)
        .to.haveOwnProperty('html')
        .include(`verify-email?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.`)
      // maybe TODO we can perhaps also check the payload of the token
    })
  })

  it('[invalid request body] should respond with 400', async () => {
    const response = await authenticatedFetch(`${baseUrl}/init`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'yay' }),
    })

    expect(response.status).to.equal(400)
  })

  context('person not signed in', () => {
    it('should respond with 401', async () => {
      const response = await fetch(`${baseUrl}/init`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'email@example.com' }),
      })

      expect(response.status).to.equal(401)
    })
  })

  context('person is not in the allowed group(s)', () => {
    it('should respond with 403', async () => {
      const response = await otherAuthenticatedFetch(`${baseUrl}/init`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'email@example.com' }),
      })

      expect(response.status).to.equal(403)
    })
  })
})
