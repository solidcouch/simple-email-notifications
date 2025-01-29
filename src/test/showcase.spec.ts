import fetch from 'cross-fetch'
import { beforeEach, describe, expect, it } from 'vitest'
import { baseUrl } from '../config/index.js'
import type { GoodBody } from '../controllers/notification.js'
import { takeScreenshot, verifyEmail } from './helpers/index.js'
import {
  authenticatedFetch,
  authenticatedFetch3,
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
  actor: { type: 'Person', id: from, name: 'PersonFromName' },
  object: { type: 'Note', id: 'https://example', content: message },
  target: { type: 'Person', id: to, name: 'PersonToName' },
})

describe('Generate screenshots of emails for visual testing', () => {
  // empty the maildev inbox
  beforeEach(async () => {
    await fetch('http://0.0.0.0:1080/email/all', { method: 'DELETE' })
  })

  beforeEach(async () => {
    // setup email for receiver
    await verifyEmail({
      email,
      person: person3,
      authenticatedFetch: authenticatedFetch3,
    })
  })

  it('[everything ok] should generate screenshots of email verification and notification in ./screenshots/ folder', async () => {
    const response = await authenticatedFetch(`${baseUrl}/notification`, {
      method: 'post',
      headers: { 'content-type': 'application/ld+json' },
      body: JSON.stringify(
        getBody({ from: person.webId, to: person3.webId, message: 'Hello!' }),
      ),
    })

    expect(response.status).to.equal(202)

    const emailResponse = await fetch('http://0.0.0.0:1080/email')
    const emails = await emailResponse.json()

    // one verification email and one notification
    expect(emails).to.have.length(2)

    for (const i in emails) {
      await takeScreenshot(emails[i], `email${i}`)
    }
  })
})
