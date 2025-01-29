import { bodyParser } from '@koa/bodyparser'
import cors from '@koa/cors'
import Router from '@koa/router'
import Koa from 'koa'
import helmet from 'koa-helmet'
import serve from 'koa-static'
import { allowedGroups, isBehindProxy } from './config/index.js'
import {
  checkVerificationLink,
  finishIntegration,
  initializeIntegration,
} from './controllers/integration.js'
import { notification } from './controllers/notification.js'
import { getStatus } from './controllers/status.js'
import {
  authorizeGroups,
  checkGroupMembership,
} from './middlewares/authorizeGroup.js'
import { solidAuth } from './middlewares/solidAuth.js'
import { validateBody } from './middlewares/validate.js'
import * as schema from './schema.js'

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
            $ref: '#/components/schemas/init',
          },
        },
      },
    }
    */
    validateBody(schema.init),
    initializeIntegration,
  )
  .get('/verify-email', checkVerificationLink, finishIntegration)
  .post(
    '/notification',
    solidAuth,
    authorizeGroups(allowedGroups),
    /* #swagger.requestBody = {
      required: true,
      content: {
        'application/ld+json': {
          schema: {
            $ref: '#/components/schemas/notification',
          },
        },
      },
    }
    */
    validateBody(schema.notification),
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
