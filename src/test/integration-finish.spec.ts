import { expect } from 'chai'
import fetch from 'cross-fetch'
import * as jsonwebtoken from 'jsonwebtoken'
import { describe } from 'mocha'
import { SinonSandbox, createSandbox } from 'sinon'
import * as config from '../config'
import { fetchRdf } from '../utils'
import { initIntegration, takeScreenshot } from './helpers'
import { setupEmailSettings } from './helpers/setupPod'
import { authenticatedFetch, person } from './testSetup.spec'

describe('email verification via /verify-email?token=jwt', () => {
  let verificationLink: string
  let sandbox: SinonSandbox
  let settings: string

  beforeEach(() => {
    sandbox = createSandbox()
    sandbox.useFakeTimers({ now: Date.now(), toFake: ['Date'] })
  })

  afterEach(() => {
    sandbox.restore()
  })

  beforeEach(async () => {
    // initialize the integration
    ;({ verificationLink } = await initIntegration({
      email: 'email@example.com',
      authenticatedFetch,
    }))
  })

  beforeEach(async () => {
    ;({ settings } = await setupEmailSettings({
      person,
      email: '',
      emailVerificationToken: '',
      authenticatedFetch,
      skipSettings: true,
    }))
  })

  it('[correct token] should respond with 200', async () => {
    const response = await fetch(verificationLink)
    expect(response.status).to.equal(200)
  })

  it('[correct token] should return proof of verification for the user to save on their pod', async () => {
    // the proof is a JWT token, it keeps email and webId of the person as payload
    const response = await fetch(verificationLink, {
      headers: { accept: 'text/plain' },
    })
    expect(response.ok).to.be.true
    const jwt = await response.text()
    const payload = jsonwebtoken.decode(jwt) as jsonwebtoken.JwtPayload

    expect(payload).to.include({
      iss: config.mailerCredentials.webId,
      webId: person.webId,
      email: 'email@example.com',
      emailVerified: true,
    })
  })

  it("[correct token] should save the verification proof to user's pod", async () => {
    // before, the settings should be empty
    const quadsBefore = await fetchRdf(settings)
    expect(quadsBefore).to.have.length(0)

    const response = await fetch(verificationLink, {
      headers: { accept: 'application/json' },
    })
    expect(response.ok).to.be.true
    const { token: jwt } = await response.json()

    // after, the settings should contain triple <webId> <verification token predicate (config)> "token".
    const quadsAfter = await fetchRdf(settings)
    expect(quadsAfter).to.have.length(1)
    expect(quadsAfter[0].subject.value).to.equal(person.webId)
    expect(quadsAfter[0].predicate.value).to.equal(
      config.verificationTokenPredicate,
    )
    expect(quadsAfter[0].object.value).to.equal(jwt)
  })

  it('[correct token & client accepts html] should display human-readable informative message', async () => {
    const response = await fetch(verificationLink, {
      headers: { accept: 'text/html' },
    })
    expect(response.ok).to.be.true
    const body = await response.text()
    expect(response.headers.get('content-type')).to.equal('text/html')
    expect(body).to.include('Your email was successfully verified')

    // generate screenshot
    await takeScreenshot({ html: body }, 'successHtmlResponse')
  })

  it('[incorrect token] should respond with 400', async () => {
    const response = await fetch(
      verificationLink.slice(0, -32) + '0'.repeat(32),
    )
    expect(response.status).to.equal(400)
    expect(await response.text()).to.equal('Verification link is invalid')
  })

  it('[missing token] should respond with 400', async () => {
    const response = await fetch(`${config.baseUrl}/verify-email`)
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
