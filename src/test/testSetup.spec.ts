import * as css from '@solid/community-server'
import fetch from 'cross-fetch'
import { getAuthenticatedFetch } from 'css-authn/dist/7.x'
import { IncomingMessage, Server, ServerResponse } from 'http'
import MailDev from 'maildev'
import { HttpResponse, http } from 'msw'
import { SetupServer, setupServer } from 'msw/node'
import app from '../app'
import { port } from '../config'
import { createRandomAccount } from './helpers'
import type { Person } from './helpers/types'

let server: Server<typeof IncomingMessage, typeof ServerResponse>
let authenticatedFetch: typeof fetch
let otherAuthenticatedFetch: typeof fetch
let authenticatedFetch3: typeof fetch
let person: Person
let otherPerson: Person
let person3: Person
let cssServer: css.App
let mockServer: SetupServer

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
    disableWeb: false, // Disable the web interface for testing
  })
  maildev.listen(done)
})
after(done => {
  maildev.close(done)
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

  otherPerson = await createRandomAccount({
    solidServer: 'http://localhost:3456',
  })
  otherAuthenticatedFetch = await getAuthenticatedFetch({
    email: otherPerson.email,
    password: otherPerson.password,
    provider: 'http://localhost:3456',
  })

  person3 = await createRandomAccount({ solidServer: 'http://localhost:3456' })
  authenticatedFetch3 = await getAuthenticatedFetch({
    ...person3,
    provider: 'http://localhost:3456',
  })
})

// Enable request interception.
beforeEach(async () => {
  mockServer = setupServer(
    // Describe network behavior with request handlers.
    // Tip: move the handlers into their own module and
    // import it across your browser and Node.js setups!
    http.get('https://example.com/', (/*{ request, params, cookies }*/) => {
      return HttpResponse.text(`
          @prefix vcard: <http://www.w3.org/2006/vcard/ns#> .
          <#us> vcard:hasMember <${person.webId}>, <${person3.webId}> .
          `)
    }),
  )
  mockServer.listen({ onUnhandledRequest() {} }) // quiet the unhandled request warnings
})

// Reset handlers so that each test could alter them
// without affecting other, unrelated tests.
afterEach(() => {
  mockServer.resetHandlers()
  mockServer.close()
})

export {
  authenticatedFetch,
  authenticatedFetch3,
  otherAuthenticatedFetch,
  otherPerson,
  person,
  person3,
}
