// https://swagger-autogen.github.io/docs/getting-started/advanced-usage#openapi-3x
import swaggerAutogen from 'swagger-autogen'

const doc = {
  info: {
    version: '',
    title: 'Solid Email Notifications',
    description:
      'Hello world! This is a Solid email notifier. Read more at https://github.com/OpenHospitalityNetwork/solid-email-notifications',
  },
  servers: [{ url: '/' }],
  tags: [],
  components: {},
}

const outputFile = '../apidocs/openapi.json'
const routes = ['./app.js']

swaggerAutogen({ openapi: '3.1.0' })(outputFile, routes, doc)
