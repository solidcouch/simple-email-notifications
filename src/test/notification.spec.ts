import fetch from 'cross-fetch'
import Mail from 'nodemailer/lib/mailer/index.js'
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
import type { GoodBody } from '../controllers/notification.js'
import * as mailerService from '../services/mailerService.js'
import { verifyEmail } from './helpers/index.js'
import {
  authenticatedFetch,
  authenticatedFetch3,
  otherAuthenticatedFetch,
  otherPerson,
  person,
  person3,
} from './setup.js'

const email = 'email@example.com'

/**
 * Generate body for POST /notification
 */
const getBody = ({
  from,
  to,
  message,
}: {
  from: string
  to: string
  message: string
}): GoodBody => ({
  '@context': 'https://www.w3.org/ns/activitystreams',
  type: 'Create',
  actor: { type: 'Person', id: from },
  object: { type: 'Note', id: 'https://example', content: message },
  target: { type: 'Person', id: to },
})

describe('send notification via /notification', () => {
  let sendMailSpy: MockInstance<(options: Mail.Options) => Promise<void>>

  beforeEach(async () => {
    // setup email for receiver
    await verifyEmail({
      email,
      person: person3,
      authenticatedFetch: authenticatedFetch3,
    })
  })

  beforeEach(() => {
    sendMailSpy = vi.spyOn(mailerService, 'sendMail')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('[everything ok] should send email to email address when requested', async () => {
    const response = await authenticatedFetch(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify(
        getBody({ from: person.webId, to: person3.webId, message: 'Hello!' }),
      ),
    })
    expect(response.status).to.equal(202)
    // let's wait a bit
    // TODO this should be improved. waiting without knowing how long isn't great
    // await promisify(setTimeout)(2000)

    expect(sendMailSpy.mock.calls.length).to.equal(1)
    const emailNotification = sendMailSpy.mock.calls[0][0]

    expect(emailNotification).to.exist
    expect(emailNotification.to).to.haveOwnProperty('address', email)

    // TODO
  })

  it('[invalid body] should fail with 400', async () => {
    const response = await authenticatedFetch(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify({ invalid: 'body' }),
    })
    expect(response.status).to.equal(400)
  })

  it('[not authenticated] should fail with 401', async () => {
    const response = await fetch(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify({}),
    })
    expect(response.status).to.equal(401)
  })

  it('[authenticated person not from group] should fail with 403', async () => {
    const response = await otherAuthenticatedFetch(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify({}),
    })
    expect(response.status).to.equal(403)
  })

  it('[receiver person not from group] should fail with 400', async () => {
    const response = await authenticatedFetch(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify(
        getBody({
          from: person.webId,
          to: otherPerson.webId,
          message: 'Hello there!',
        }),
      ),
    })
    expect(response.status).to.equal(400)
    const body = await response.text()
    expect(body).to.equal('Person is not a member of any allowed group')
  })

  it('[actor is not authenticated person] should fail with 403', async () => {
    const response = await authenticatedFetch3(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify(
        getBody({
          from: person.webId,
          to: person3.webId,
          message: 'Hello there!',
        }),
      ),
    })
    expect(response.status).to.equal(403)
    const body = await response.text()
    expect(body).to.equal("You can't send notification as somebody else")
  })

  it("[receiver person doesn't have verified email address] should fail with 404", async () => {
    const response = await authenticatedFetch3(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify(
        getBody({
          from: person3.webId,
          to: person.webId,
          message: 'Hello there!',
        }),
      ),
    })
    expect(response.status).to.equal(404)
    const body = await response.text()
    expect(body).to.equal(
      "Receiving person doesn't have available email address",
    )
  })
})
