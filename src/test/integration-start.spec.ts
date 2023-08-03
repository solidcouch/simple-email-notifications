import { expect } from 'chai'
import { describe } from 'mocha'
import Mail from 'nodemailer/lib/mailer'
import { SinonSandbox, SinonSpy, createSandbox } from 'sinon'
import * as mailerService from '../services/mailerService'
import { authenticatedFetch } from './testSetup.spec'

describe('Mailer integration via /inbox', () => {
  let sendMailSpy: SinonSpy<[options: Mail.Options], Promise<void>>
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = createSandbox()
    sendMailSpy = sandbox.spy(mailerService, 'sendMail')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should be able to receive integration request to inbox', async () => {
    const response = await authenticatedFetch(`http://localhost:3005/inbox`, {
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
        object: 'http://localhost:3456/person/inbox/',
        target: 'email@example.com',
      }),
    })

    expect(sendMailSpy.calledOnce).to.be.true
    expect(sendMailSpy.firstCall.firstArg).to.haveOwnProperty(
      'to',
      'email@example.com',
    )
    expect(sendMailSpy.firstCall.firstArg)
      .to.haveOwnProperty('text')
      .include(
        `verify-email?id=${encodeURIComponent(
          'http://localhost:3456/person/profile/card#me',
        )}&token=`,
      )
    expect(sendMailSpy.firstCall.firstArg)
      .to.haveOwnProperty('html')
      .include(
        `verify-email?id=${encodeURIComponent(
          'http://localhost:3456/person/profile/card#me',
        )}&token=`,
      )
    expect(response.status).to.equal(200)
  })

  context('person not signed in', () => {
    it('should respond with 401', async () => {
      const response = await fetch(`http://localhost:3005/inbox`, {
        method: 'post',
        headers: { 'content-type': 'application/ld+json' },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          '@id': '',
          '@type': 'Add',
          actor: 'http://localhost:3456/person/profile/card#me',
          object: 'http://localhost:3456/person/inbox/',
          target: 'email@example.com',
        }),
      })

      expect(response.status).to.equal(401)
    })
  })

  context("authenticated person and actor don't match", () => {
    it('should respond with 403', async () => {
      const response = await authenticatedFetch(`http://localhost:3005/inbox`, {
        method: 'post',
        headers: { 'content-type': 'application/ld+json' },
        body: JSON.stringify({
          '@context': 'https://www.w3.org/ns/activitystreams',
          '@id': '',
          '@type': 'Add',
          actor: 'http://localhost:3456/person2/profile/card#me',
          object: 'http://localhost:3456/person/inbox/',
          target: 'email2@example.com',
        }),
      })

      expect(response.status).to.equal(403)
    })
  })

  it('should check that the person requesting is the authenticated person', async () => {
    const response = await authenticatedFetch(`http://localhost:3005/inbox`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify({}),
    })

    expect(response.status).to.equal(403)
  })

  it(
    'should check that the inbox belongs to the person requesting subscription',
  )

  it('should check that it can read the inbox')

  it('should send email with verification link')
})
