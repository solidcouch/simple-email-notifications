import bodyParser from '@koa/bodyparser'
import Router from '@koa/router'
import { hash } from 'bcryptjs'
import crypto from 'crypto'
import Koa from 'koa'
import helmet from 'koa-helmet'
import { EmailVerification } from './config/sequelize'
import { solidAuth } from './middlewares/solidAuth'
import { sendMail } from './services/mailerService'

const app = new Koa()
const router = new Router()

router
  .get('/', (ctx, next) => {
    ctx.response.body =
      'Hello world! This is a Solid email notifier. Read more at https://github.com/openHospitalityNetwork/solid-email-notifications'
  })
  .post('/inbox', solidAuth, async (ctx, next) => {
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
    const tokenExpiration = Date.now() + 3600 * 1000

    // save the webId, email, and hashedToken to database
    try {
      await EmailVerification.create({
        webId,
        email,
        inbox,
        tokenHash,
        tokenExpiration,
      })
    } catch (e) {
      console.error(e)
    }

    const emailVerificationLink = `https://example.com/verify-email?id=${encodeURIComponent(
      webId,
    )}&token=${token}`

    await sendMail({
      to: email,
      html: `Please verify your email <a href="${emailVerificationLink}">click here</a>`,
      text: `Please verify your email ${emailVerificationLink}`,
    })
    ctx.response.body = 'not implemented'
  })
  .get('/verify-email', async (ctx, next) => {
    ctx.response.body = 'not implemented'
  })
  .post('/webhook-receiver', async ctx => {
    console.log(ctx.headers)
    console.log(ctx.request.rawBody)
    ctx.response.status = 202
    ctx.response.body = 'Accepted'
  })

app
  .use(helmet())
  .use(
    bodyParser({
      enableTypes: ['text', 'json'],
      extendTypes: {
        json: ['application/ld+json'],
        text: ['text/turtle'],
      },
    }),
  )
  .use(router.routes())
  .use(router.allowedMethods())

export default app
