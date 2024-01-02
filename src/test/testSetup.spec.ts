import * as css from '@solid/community-server'
import { getAuthenticatedFetch } from 'css-authn/dist/7.x'
import { IncomingMessage, Server, ServerResponse } from 'http'
import MailDev from 'maildev'
import app from '../app'
import { port } from '../config'
import { EmailVerification, Integration } from '../config/sequelize'
import { createRandomAccount } from '../helpers'

let server: Server<typeof IncomingMessage, typeof ServerResponse>
let authenticatedFetch: typeof fetch
let authenticatedFetchNoNotifications: typeof fetch
let person: {
  idp: string
  podUrl: string
  webId: string
  username: string
  password: string
  email: string
}
let personNoNotifications: {
  idp: string
  podUrl: string
  webId: string
  username: string
  password: string
  email: string
}
let cssServer: css.App
let cssServerNoNotifications: css.App

before(async function () {
  this.timeout(60000)
  const start = Date.now()

  // eslint-disable-next-line no-console
  console.log('Starting CSS server')
  // Community Solid Server (CSS) set up following example in https://github.com/CommunitySolidServer/hello-world-component/blob/main/test/integration/Server.test.ts
  cssServer = await new css.AppRunner().create({
    loaderProperties: {
      mainModulePath: css.joinFilePath(__dirname, '../../'), // ?
      typeChecking: false, // ?
      dumpErrorState: false, // disable CSS error dump
    },
    config: css.joinFilePath(__dirname, './css-default-config.json'), // CSS config
    variableBindings: {},
    // CSS cli options
    // https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main#-parameters
    shorthand: {
      port: 3456,
      loggingLevel: 'off',
      seedConfig: css.joinFilePath(__dirname, './css-pod-seed.json'), // set up some Solid accounts
    },
  })
  await cssServer.start()

  // eslint-disable-next-line no-console
  console.log('CSS server started in', (Date.now() - start) / 1000, 'seconds')
})

after(async () => {
  await cssServer.stop()
})

before(async function () {
  this.timeout(60000)
  const start = Date.now()

  // eslint-disable-next-line no-console
  console.log('Starting CSS server without notifications')
  // Community Solid Server (CSS) set up following example in https://github.com/CommunitySolidServer/hello-world-component/blob/main/test/integration/Server.test.ts
  cssServerNoNotifications = await new css.AppRunner().create({
    loaderProperties: {
      mainModulePath: css.joinFilePath(__dirname, '../../'), // ?
      typeChecking: false, // ?
      dumpErrorState: false, // disable CSS error dump
    },
    config: css.joinFilePath(__dirname, './css-config-no-notifications.json'), // CSS config
    variableBindings: {},
    // CSS cli options
    // https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main#-parameters
    shorthand: {
      port: 3457,
      loggingLevel: 'off',
      // seededPodConfigJson: css.joinFilePath(__dirname, './css-pod-seed.json'), // set up some Solid accounts
    },
  })
  await cssServerNoNotifications.start()

  // eslint-disable-next-line no-console
  console.log('CSS server started in', (Date.now() - start) / 1000, 'seconds')
})

after(async () => {
  await cssServerNoNotifications.stop()
})

before(done => {
  server = app.listen(port, done)
})
after(done => {
  server.close(done)
})

// run maildev server
let maildev: InstanceType<typeof MailDev>
before(done => {
  maildev = new MailDev({
    silent: true, // Set to false if you want to see server logs
    disableWeb: true, // Disable the web interface for testing
  })
  maildev.listen(done)
})
after(done => {
  maildev.close(done)
})

// clear the database before each test
beforeEach(async () => {
  await EmailVerification.destroy({ truncate: true })
  await Integration.destroy({ truncate: true })
})

/**
 * Before each test, create a new account and authenticate to it
 */
beforeEach(async () => {
  person = await createRandomAccount({ solidServer: 'http://localhost:3456' })
  authenticatedFetch = await getAuthenticatedFetch({
    email: person.email,
    password: person.password,
    provider: 'http://localhost:3456',
  })
})

beforeEach(async () => {
  personNoNotifications = await createRandomAccount({
    solidServer: 'http://localhost:3457',
  })
  authenticatedFetchNoNotifications = await getAuthenticatedFetch({
    email: personNoNotifications.email,
    password: personNoNotifications.password,
    provider: 'http://localhost:3457',
  })
})

export {
  authenticatedFetch,
  authenticatedFetchNoNotifications,
  cssServer,
  cssServerNoNotifications,
  person,
  personNoNotifications,
  server,
}
