import bodyParser from '@koa/bodyparser'
import Router from '@koa/router'
import Koa from 'koa'
import helmet from 'koa-helmet'
import {
  checkVerificationLink,
  finishIntegration,
  initializeIntegration,
} from './controllers/integration'
import { solidAuth } from './middlewares/solidAuth'

const app = new Koa()
const router = new Router()

router
  .get('/', ctx => {
    ctx.response.body =
      'Hello world! This is a Solid email notifier. Read more at https://github.com/openHospitalityNetwork/solid-email-notifications'
  })
  .post('/inbox', solidAuth, initializeIntegration)
  .get('/verify-email', checkVerificationLink, finishIntegration)
  .post('/webhook-receiver', async ctx => {
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
