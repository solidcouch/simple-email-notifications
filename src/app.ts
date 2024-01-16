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
import { notification } from './controllers/notification'
import { getStatus } from './controllers/status'
import {
  authorizeGroups,
  checkGroupMembership,
} from './middlewares/authorizeGroup'
import { solidAuth } from './middlewares/solidAuth'
import { validateBody } from './middlewares/validate'

const app = new Koa()
app.proxy = isBehindProxy
const router = new Router()

router
  .post(
    '/init',
    solidAuth,
    authorizeGroups(allowedGroups),
    /* #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
            },
            required: ['email'],
            additionalProperties: false,
          },
        },
      },
    }
    */
    validateBody({
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
      required: ['email'],
      additionalProperties: false,
    }),
    initializeIntegration,
  )
  .get('/verify-email', checkVerificationLink, finishIntegration)
  .post(
    '/notification',
    solidAuth,
    authorizeGroups(allowedGroups),
    validateBody({
      type: 'object',
      properties: {
        '@context': { const: 'https://www.w3.org/ns/activitystreams' },
        id: { type: 'string' },
        type: { const: 'Create' },
        actor: {
          type: 'object',
          properties: {
            type: { const: 'Person' },
            id: { type: 'string', format: 'uri' },
            name: { type: 'string' },
          },
          required: ['type', 'id'],
        },
        object: {
          type: 'object',
          properties: {
            type: { const: 'Note' },
            id: { type: 'string', format: 'uri' },
            content: { type: 'string' },
          },
          required: ['type', 'id', 'content'],
        },
        target: {
          type: 'object',
          properties: {
            type: { const: 'Person' },
            id: { type: 'string', format: 'uri' },
            name: { type: 'string' },
          },
          required: ['type', 'id'],
        },
      },
      required: ['@context', 'type', 'actor', 'object', 'target'],
      additionalProperties: false,
    }),
    checkGroupMembership(allowedGroups, 'request.body.target.id', 400),
    notification,
  )
  .get(
    '/status/:webId',
    solidAuth,
    authorizeGroups(allowedGroups),
    checkGroupMembership(allowedGroups, 'params.webId', 400),
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
