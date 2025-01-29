import fetch from 'cross-fetch'
import Mail from 'nodemailer/lib/mailer'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest'
import { baseUrl } from '../config/index.js'
import * as mailerService from '../services/mailerService.js'
import { authenticatedFetch, otherAuthenticatedFetch } from './setup.js'

describe('Initialize email integration via /init', () => {
  let sendMailSpy: MockInstance<(options: Mail.Options) => Promise<void>>

  beforeEach(() => {
    sendMailSpy = vi.spyOn(mailerService, 'sendMail')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('everything ok', () => {
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
      expect(sendMailSpy.mock.calls).to.have.length(1)
      expect(sendMailSpy.mock.calls[0][0]).to.haveOwnProperty(
        'to',
        'email@example.com',
      )
      expect(sendMailSpy.mock.calls[0][0])
        .to.haveOwnProperty('text')
        .include(`verify-email?token=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.`)
      expect(sendMailSpy.mock.calls[0][0])
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

  describe('person not signed in', () => {
    it('should respond with 401', async () => {
      const response = await fetch(`${baseUrl}/init`, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'email@example.com' }),
      })

      expect(response.status).to.equal(401)
    })
  })

  describe('person is not in the allowed group(s)', () => {
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
