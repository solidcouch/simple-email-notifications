import { expect } from 'chai'
import * as cheerio from 'cheerio'
import fetch from 'cross-fetch'
import { getAuthenticatedFetch } from 'css-authn/dist/7.x'
import { describe } from 'mocha'
import Mail from 'nodemailer/lib/mailer'
import { SinonSandbox, SinonSpy, createSandbox } from 'sinon'
import { promisify } from 'util'
import { baseUrl } from '../config'
import * as mailerService from '../services/mailerService'
import { addRead, setupInbox } from '../setup'
import { authenticatedFetch, person } from './testSetup.spec'

describe('received notification via /webhook-receiver', () => {
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
      inbox: person.podUrl + 'inbox/',
      authenticatedFetch,
    })

    await addRead({
      resource: person.podUrl + 'inbox/',
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
        object: person.podUrl + 'inbox/',
        target: 'email@example.com',
      }),
    })

    expect(initResponse.status).to.equal(200)
    // email was sent
    const emailMessage = sendMailSpy.firstCall.firstArg.html
    const $ = cheerio.load(emailMessage)
    verificationLink = $('a').first().attr('href') as string
    expect(verificationLink).to.not.be.null

    // finish the integration
    const finishResponse = await fetch(verificationLink)
    expect(finishResponse.status).to.equal(200)
  })

  it('[everything ok] should send email to email address when notifiation arrives', async function () {
    this.timeout(10000)
    // create notification in inbox of person2
    const authenticatedPerson2Fetch = await getAuthenticatedFetch({
      email: 'person2@example',
      password: 'password',
      provider: 'http://localhost:3456',
    })
    const addToInboxResponse = await authenticatedPerson2Fetch(
      person.podUrl + 'inbox/',
      {
        method: 'POST',
        headers: {
          'content-type': 'text/turtle',
          body: '<https://example.com/subject> <https://example.com/predicate> <https://example.com/object>.',
        },
      },
    )

    expect(addToInboxResponse.ok).to.be.true

    // let's wait a bit
    // TODO this should be improved. waiting without knowing how long isn't great
    await promisify(setTimeout)(2000)

    expect(sendMailSpy.callCount).to.equal(2)
    const emailNotification = sendMailSpy.secondCall.firstArg

    expect(emailNotification).to.exist
    expect(emailNotification.to).to.equal('email@example.com')

    // TODO
  })

  it('[irrelevant update] should do nothing')
})
