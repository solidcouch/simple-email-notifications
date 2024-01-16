import { expect } from 'chai'
import fetch from 'cross-fetch'
import * as jsonwebtoken from 'jsonwebtoken'
import { describe } from 'mocha'
import { SinonSandbox, createSandbox } from 'sinon'
import * as config from '../config'
import { initIntegration } from './helpers'
import { authenticatedFetch, person } from './testSetup.spec'

describe('email verification via /verify-email?token=jwt', () => {
  let verificationLink: string
  let sandbox: SinonSandbox

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

  it('[correct token] should respond with 200', async () => {
    const response = await fetch(verificationLink)
    expect(response.status).to.equal(200)
  })

  it('[correct token] should return proof of verification for the user to save on their pod', async () => {
    // the proof is a JWT token, it keeps email and webId of the person as payload
    const response = await fetch(verificationLink)
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

  it("[correct token] (maybe) should save the verification proof to user's pod")

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
