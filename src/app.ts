import bodyParser from '@koa/bodyparser'
import cors from '@koa/cors'
import Router from '@koa/router'
import Koa from 'koa'
import helmet from 'koa-helmet'
import serve from 'koa-static'
import {
  checkVerificationLink,
  finishIntegration,
  initializeIntegration,
} from './controllers/integration'
import { getStatus } from './controllers/status'
import { webhookReceiver } from './controllers/webhookReceiver'
import { solidAuth } from './middlewares/solidAuth'
import { validateBody } from './middlewares/validate'

const app = new Koa()
const router = new Router()

router
  .post(
    '/inbox',
    solidAuth,
    /*
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              '@context': { const: 'https://www.w3.org/ns/activitystreams' },
              '@id': { type: 'string' },
              '@type': { const: 'Add' },
              actor: { type: 'string', format: 'uri' },
              object: { type: 'string', format: 'uri' },
              target: { type: 'string', format: 'email' },
            },
            required: ['@context', '@type', 'actor', 'object', 'target'],
            additionalProperties: false,
          },
        },
      },
    }
    */
    validateBody({
      type: 'object',
      properties: {
        '@context': { const: 'https://www.w3.org/ns/activitystreams' },
        '@id': { type: 'string' },
        '@type': { const: 'Add' },
        actor: { type: 'string', format: 'uri' },
        object: { type: 'string', format: 'uri' },
        target: { type: 'string', format: 'email' },
      },
      required: ['@context', '@type', 'actor', 'object', 'target'],
      additionalProperties: false,
    }),
    initializeIntegration,
  )
  .get('/verify-email', checkVerificationLink, finishIntegration)
  .post('/webhook-receiver', webhookReceiver)
  .get('/status', solidAuth, getStatus)

app
  .use(helmet())
  .use(cors())
  .use(
    bodyParser({
      enableTypes: ['text', 'json'],
      extendTypes: {
        json: ['application/ld+json'],
        text: ['text/turtle'],
      },
    }),
  )
  .use(serve('./apidocs'))
  .use(router.routes())
  .use(router.allowedMethods())

export default app
