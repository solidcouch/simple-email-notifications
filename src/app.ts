import bodyParser from '@koa/bodyparser'
import cors from '@koa/cors'
import Router from '@koa/router'
import Koa from 'koa'
import helmet from 'koa-helmet'
import serve from 'koa-static'
import { allowedGroups, isBehindProxy } from './config'
import {
  checkVerificationLink,
  finishIntegration,
  initializeIntegration,
} from './controllers/integration'
import { getStatus } from './controllers/status'
import { webhookReceiver } from './controllers/webhookReceiver'
import {
  authorizeGroups,
  checkParamGroupMembership,
} from './middlewares/authorizeGroup'
import { solidAuth } from './middlewares/solidAuth'
import { validateBody } from './middlewares/validate'

const app = new Koa()
app.proxy = isBehindProxy
const router = new Router()

router
  // .post(
  //   '/inbox',
  //   solidAuth,
  //   /*
  //   #swagger.requestBody = {
  //     required: true,
  //     content: {
  //       'application/json': {
  //         schema: {
  //           type: 'object',
  //           properties: {
  //             '@context': { const: 'https://www.w3.org/ns/activitystreams' },
  //             '@id': { type: 'string' },
  //             '@type': { const: 'Add' },
  //             actor: { type: 'string', format: 'uri' },
  //             object: { type: 'string', format: 'uri' },
  //             target: { type: 'string', format: 'email' },
  //           },
  //           required: ['@context', '@type', 'actor', 'object', 'target'],
  //           additionalProperties: false,
  //         },
  //       },
  //     },
  //   }
  //   */
  //   validateBody({
  //     type: 'object',
  //     properties: {
  //       '@context': { const: 'https://www.w3.org/ns/activitystreams' },
  //       '@id': { type: 'string' },
  //       '@type': { const: 'Add' },
  //       actor: { type: 'string', format: 'uri' },
  //       object: { type: 'string', format: 'uri' },
  //       target: { type: 'string', format: 'email' },
  //     },
  //     required: ['@context', '@type', 'actor', 'object', 'target'],
  //     additionalProperties: false,
  //   }),
  //   initializeIntegration,
  // )
  .post(
    '/init',
    solidAuth,
    authorizeGroups(allowedGroups),
    // #swagger.requestBody = {
    //   required: true,
    //   content: {
    //     'application/json': {
    //       schema: {
    //         type: 'object',
    //         properties: {
    //           email: { type: 'string', format: 'email' },
    //         },
    //         required: ['email'],
    //         additionalProperties: false,
    //       },
    //     },
    //   },
    // }
    validateBody({
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
      required: ['email'],
      additionalProperties: false,
    }),
    initializeIntegration,
  )
  .get('/verify-email', checkVerificationLink, finishIntegration)
  .post('/webhook-receiver', webhookReceiver)
  .get(
    '/status/:webId',
    solidAuth,
    authorizeGroups(allowedGroups),
    checkParamGroupMembership(allowedGroups, 'webId' as const),
    getStatus,
  )

app
  .use(helmet())
  .use(cors())
  .use(
    bodyParser({
      enableTypes: ['text', 'json'],
      extendTypes: {
        json: ['application/ld+json', 'application/json'],
        text: ['text/turtle'],
      },
    }),
  )
  .use(serve('./apidocs'))
  .use(router.routes())
  .use(router.allowedMethods())

export default app
