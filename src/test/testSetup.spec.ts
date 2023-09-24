import * as css from '@solid/community-server'
import { IncomingMessage, Server, ServerResponse } from 'http'
import MailDev from 'maildev'
import app from '../app'
import { port } from '../config'
import { EmailVerification } from '../config/sequelize'
import { getAuthenticatedFetch } from '../helpers'

let server: Server<typeof IncomingMessage, typeof ServerResponse>
let authenticatedFetch: typeof fetch
let cssServer: css.App

before(async function () {
  this.timeout(60000)
  const start = Date.now()

  // eslint-disable-next-line no-console
  console.log('Starting CSS server')
  // Community Solid Server (CSS) set up following example in https://github.com/CommunitySolidServer/hello-world-component/blob/main/test/integration/Server.test.ts
  cssServer = await new css.AppRunner().create(
    {
      mainModulePath: css.joinFilePath(__dirname, '../../'), // ?
      typeChecking: false, // ?
      dumpErrorState: false, // disable CSS error dump
    },
    css.joinFilePath(__dirname, './css-default-config.json'), // CSS config
    {},
    // CSS cli options
    // https://github.com/CommunitySolidServer/CommunitySolidServer/tree/main#-parameters
    {
      port: 3456,
      loggingLevel: 'off',
      seededPodConfigJson: css.joinFilePath(__dirname, './css-pod-seed.json'), // set up some Solid accounts
    },
  )
  await cssServer.start()

  // eslint-disable-next-line no-console
  console.log('CSS server started in', (Date.now() - start) / 1000, 'seconds')

  authenticatedFetch = await getAuthenticatedFetch({
    email: 'person@example',
    password: 'password',
    solidServer: 'http://localhost:3456',
  })
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
})

export { authenticatedFetch, cssServer, server }
