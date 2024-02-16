// https://swagger-autogen.github.io/docs/getting-started/advanced-usage#openapi-3x
import swaggerAutogen from 'swagger-autogen'
import { init, notification } from './schema'

const doc = {
  info: {
    version: '',
    title: 'Simple Email Notifications',
    description:
      'Hello world! This is a simple email notifier for Solid apps. Read more at https://github.com/OpenHospitalityNetwork/simple-email-notifications',
  },
  servers: [{ url: '/' }],
  tags: [],
  components: { '@schemas': { init, notification } },
}

const outputFile = '../apidocs/openapi.json'
const routes = ['./app.js']

swaggerAutogen({ openapi: '3.1.0' })(outputFile, routes, doc)
