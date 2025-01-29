import fetch from 'cross-fetch'
import { beforeEach, describe, expect, it } from 'vitest'
import { baseUrl } from '../config/index.js'
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

describe('get info about integrations of a person with GET /status/:webId', () => {
  beforeEach(async () => {
    await verifyEmail({ email, authenticatedFetch, person })
  })

  it('[not authenticated] should fail with 401', async () => {
    const response = await fetch(
      `${baseUrl}/status/${encodeURIComponent(person.webId)}`,
    )
    expect(response.status).to.equal(401)
  })

  it('[authenticated person not from group] should fail with 403', async () => {
    const response = await otherAuthenticatedFetch(
      `${baseUrl}/status/${encodeURIComponent(person.webId)}`,
    )
    expect(response.status).to.equal(403)
  })

  it('[requested person not from group] should fail with 400', async () => {
    const response = await authenticatedFetch(
      `${baseUrl}/status/${encodeURIComponent(otherPerson.webId)}`,
    )
    expect(response.status).to.equal(400)
  })

  it('should say that email of user is verified', async () => {
    const response = await authenticatedFetch3(
      `${baseUrl}/status/${encodeURIComponent(person.webId)}`,
    )
    expect(response.status).to.equal(200)

    const body = await response.json()

    expect(body).to.deep.equal({ emailVerified: true })
  })

  it('should say that email of user is not verified', async () => {
    const response = await authenticatedFetch(
      `${baseUrl}/status/${encodeURIComponent(person3.webId)}`,
    )
    expect(response.status).to.equal(200)

    const body = await response.json()

    expect(body).to.deep.equal({ emailVerified: false })
  })
})
