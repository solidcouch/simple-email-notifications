import { readFile } from 'fs-extra'
import * as jsonwebtoken from 'jsonwebtoken'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { Middleware } from 'koa'
import { pick } from 'lodash'
import * as config from '../config'
import { sendMail } from '../services/mailerService'
import { findWritableSettings, getBotFetch } from '../utils'

export const initializeIntegration: Middleware = async ctx => {
  // we should receive info about webId and email address
  const email: string = ctx.request.body.email
  const user: string = ctx.state.user

  // make a jwt token that verifies email address

  const tokenExpiration = config.emailVerificationExpiration

  const pem = await readFile(config.jwt.key, { encoding: 'utf-8' })
  const jwt = jsonwebtoken.sign(
    {
      webId: user,
      email,
      emailVerified: false,
      iss: config.mailerCredentials.webId,
    },
    pem,
    { algorithm: 'ES256', expiresIn: tokenExpiration },
  )

  const emailVerificationLink = `${config.baseUrl}/verify-email?token=${jwt}`

  await sendMail({
    from: config.emailSender,
    to: email,
    subject: 'Verify your email for sleepy.bike notifications',
    html: `Please verify your email <a href="${emailVerificationLink}">click here</a>`,
    text: `Please verify your email ${emailVerificationLink}`,
  })
  ctx.response.body = 'Success'
}

export const checkVerificationLink: Middleware = async (ctx, next) => {
  const jwt = ctx.request.query.token

  if (typeof jwt !== 'string' || !jwt)
    return ctx.throw(
      400,
      'This is not a valid verification link. Have you received the link in your email?',
    )

  const pem = await readFile(config.jwt.key, { encoding: 'utf-8' })
  try {
    const payload = jsonwebtoken.verify(jwt, pem) as {
      webId: string
      email: string
      emailVerified: boolean
      iss: string
      iat: number
      exp: number
    }

    ctx.state.integration = pick(payload, 'email', 'webId')
    await next()
  } catch (error) {
    if (error instanceof TokenExpiredError)
      return ctx.throw(400, 'Verification link is expired')

    if (error instanceof JsonWebTokenError)
      return ctx.throw(400, 'Verification link is invalid')

    throw error
  }
}

export const finishIntegration: Middleware = async ctx => {
  const { webId, email } = ctx.state.integration as {
    webId: string
    email: string
  }

  const pem = await readFile(config.jwt.key, { encoding: 'utf-8' })
  const jwt = jsonwebtoken.sign(
    { webId, email, emailVerified: true, iss: config.mailerCredentials.webId },
    pem,
    { algorithm: 'ES256' },
  )

  // save the token to person
  const savedTokensCount = await saveTokenToPerson(jwt, webId)

  if (savedTokensCount === 0)
    return ctx.throw(
      400,
      "We could't find any writeable location on your Pod to save the email verifiation token.",
    )

  ctx.response.body = jwt
  ctx.set('content-type', 'text/plain')
  ctx.response.status = 200
}

/**
 * Find writable settings files on person's pod
 * and save the email verification token there
 */
const saveTokenToPerson = async (token: string, webId: string) => {
  // find candidates for saving the token
  const settings = await findWritableSettings(webId)
  const authBotFetch = await getBotFetch()
  // save the token to the candidates and keep track of how many succeeded
  let okCount = 0
  for (const uri of settings) {
    const patch = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
    _:patch a solid:InsertDeletePatch;
      solid:inserts {
        <${webId}> <${config.verificationTokenPredicate}> "${token}" .
      } .`
    const response = await authBotFetch(uri, {
      method: 'PATCH',
      headers: { 'content-type': 'text/n3' },
      body: patch,
    })

    if (response.ok) okCount++
  }

  return okCount
}
