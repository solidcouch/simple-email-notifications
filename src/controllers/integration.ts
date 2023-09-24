import { compare, hash } from 'bcryptjs'
import crypto from 'crypto'
import { Middleware } from 'koa'
import { pick } from 'lodash'
import n3 from 'n3'
import parseLinkHeader from 'parse-link-header'
import * as config from '../config'
import { EmailVerification, Integration } from '../config/sequelize'
import { getAuthenticatedFetch } from '../helpers'
import { sendMail } from '../services/mailerService'

export const initializeIntegration: Middleware = async ctx => {
  // we should receive info about webId and email address
  const email: string = ctx.request.body.target
  const webId: string = ctx.request.body.actor
  const inbox: string = ctx.request.body.object

  // webId should belong to the authenticated user

  if (webId !== ctx.state.user) ctx.throw(403, {})

  // search for webId's inbox

  // try to subscribe to the inbox

  // send verification email to provided email address
  const token = crypto.randomBytes(64).toString('base64url').slice(0, 72) // there is no sense in having more than 72, since bcrypt cuts remaining stuff away
  // or we would need to use different hashing
  const tokenHash = await hash(token, 12)
  // tokens should expire (in 1 hour perhaps?)
  const tokenExpiration = Date.now() + config.emailVerificationExpiration

  // save the webId, email, and hashedToken to database
  await EmailVerification.create({
    webId,
    email,
    inbox,
    tokenHash,
    tokenExpiration,
  })

  const emailVerificationLink = `${
    config.baseUrl
  }/verify-email?id=${encodeURIComponent(webId)}&token=${token}`

  await sendMail({
    to: email,
    subject: 'TODO',
    html: `Please verify your email <a href="${emailVerificationLink}">click here</a>`,
    text: `Please verify your email ${emailVerificationLink}`,
  })
  ctx.response.body = 'Success'
}

export const checkVerificationLink: Middleware = async (ctx, next) => {
  const webId = ctx.request.query.id
  const token = ctx.request.query.token

  if (
    typeof webId !== 'string' ||
    typeof token !== 'string' ||
    !webId ||
    !token
  )
    return ctx.throw(
      400,
      'This is not a valid verification link. Have you received the link in your email?',
    )

  const verification = await EmailVerification.findOne({ where: { webId } })

  if (!verification) return ctx.throw(400, 'Verification link is invalid')

  const isCorrectToken = await compare(token, verification.tokenHash)

  if (!isCorrectToken) return ctx.throw(400, 'Verification link is invalid')

  ctx.state.integration = pick(
    verification.dataValues,
    'inbox',
    'email',
    'webId',
  )

  await verification.destroy()

  if (verification.tokenExpiration < Date.now()) {
    return ctx.throw(400, 'Verification link is expired')
  }

  await next()
}

export const finishIntegration: Middleware = async ctx => {
  const integrationData = ctx.state.integration as {
    webId: string
    inbox: string
    email: string
  }

  // save the integration to database
  await Integration.create(integrationData)

  // subscribe to the inbox' webhook notifications
  await subscribeForNotifications(integrationData.inbox)

  ctx.response.body =
    'Email notifications have been successfully integrated to your inbox'
  ctx.response.status = 200
}

type Fetch = typeof fetch

/**
 * Discover a webhook channel to subscribe to a resource
 */
const getWebhookChannel = async (
  url: string,
  fetch: Fetch,
): Promise<string> => {
  const resourceInfo = await fetch(url, {
    method: 'HEAD',
  })

  if (!resourceInfo.ok) throw new Error('Fetch of resource not successful')

  const linkHeader = parseLinkHeader(resourceInfo.headers.get('link'))

  if (!linkHeader) throw new Error('Link header not found')

  const storageDescriptionUri =
    linkHeader['http://www.w3.org/ns/solid/terms#storageDescription']?.url

  const descriptionResourceUri = linkHeader.describedby?.url

  if (!storageDescriptionUri) throw new Error('storage description not found')

  const storageDescriptionResponse = await fetch(storageDescriptionUri)
  const storageDescription = await storageDescriptionResponse.text()

  // parse the RDF that we received
  const parser = new n3.Parser({
    format: storageDescriptionResponse.headers.get('content-type') ?? undefined,
    baseIRI: storageDescriptionUri,
  })
  const triples = parser.parse(storageDescription)

  // find the webhook channel to subscribe to
  // in storage description
  const webhookChannelTriple = triples.find(
    triple =>
      triple.predicate.id ===
        'http://www.w3.org/ns/solid/notifications#channelType' &&
      triple.object.id ===
        'http://www.w3.org/ns/solid/notifications#WebhookChannel2023',
  )

  if (!webhookChannelTriple) throw new Error('webhook channel not found')

  const dru = new URL(descriptionResourceUri as string, url).toString()
  // we want to include looking into this resource, too
  const descriptionResource = await (await fetch(dru)).text()

  return webhookChannelTriple.subject.id
}

const subscribeForNotifications = async (resourceUrl: string) => {
  const authenticatedMailerFetch = await getAuthenticatedFetch(
    config.mailerCredentials,
  )

  const webhookChannel = await getWebhookChannel(
    resourceUrl,
    authenticatedMailerFetch,
  )

  return await authenticatedMailerFetch(webhookChannel, {
    method: 'POST',
    body: JSON.stringify({
      '@context': ['https://www.w3.org/ns/solid/notification/v1'],
      type: 'http://www.w3.org/ns/solid/notifications#WebhookChannel2023',
      topic: resourceUrl,
      sendTo: `${config.baseUrl}/webhook-receiver`,
    }),
    headers: { 'content-type': 'application/ld+json' },
  })
}
