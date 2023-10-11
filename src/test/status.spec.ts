import { expect } from 'chai'
import * as cheerio from 'cheerio'
import { describe } from 'mocha'
import Mail from 'nodemailer/lib/mailer'
import { SinonSandbox, SinonSpy, createSandbox } from 'sinon'
import { baseUrl } from '../config'
import * as mailerService from '../services/mailerService'
import { addRead, setupInbox } from '../setup'
import { authenticatedFetch, person } from './testSetup.spec'

describe('get info about integrations of current person with GET /status', () => {
  let sendMailSpy: SinonSpy<[options: Mail.Options], Promise<void>>
  let verificationLink: string
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = createSandbox()
    sendMailSpy = sandbox.spy(mailerService, 'sendMail')
  })

  afterEach(() => {
    sandbox.restore()
  })

  beforeEach(async () => {
    await setupInbox({
      webId: person.webId,
      inbox: `${person.podUrl}inbox/`,
      authenticatedFetch,
    })

    await addRead({
      resource: `${person.podUrl}inbox/`,
      agent: 'http://localhost:3456/bot/profile/card#me',
      authenticatedFetch,
    })
  })

  beforeEach(async function () {
    this.timeout(10000)
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
        actor: person.webId,
        object: `${person.podUrl}inbox/`,
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

  it('[not authenticated] should fail with 401', async () => {
    const response = await fetch(`${baseUrl}/status`)
    expect(response.status).to.equal(401)
  })

  it('should show list of resources (inboxes) current user is observing', async () => {
    // finish the integration
    const finishResponse = await fetch(verificationLink)
    expect(finishResponse.status).to.equal(200)

    const response = await authenticatedFetch(`${baseUrl}/status`)
    expect(response.status).to.equal(200)

    const body = await response.json()

    expect(body).to.deep.equal({
      actor: person.webId,
      integrations: [
        {
          object: `${person.podUrl}inbox/`,
          target: 'email@example.com',
          verified: true,
        },
      ],
    })
  })

  it('should show unverified integrations', async () => {
    const response = await authenticatedFetch(`${baseUrl}/status`)
    expect(response.status).to.equal(200)

    const body = await response.json()

    expect(body).to.deep.equal({
      actor: person.webId,
      integrations: [
        {
          object: `${person.podUrl}inbox/`,
          target: 'email@example.com',
          verified: false,
        },
      ],
    })
  })
})
