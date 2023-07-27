import { config } from 'dotenv'
import app from './app'
import { getAuthenticatedFetch } from './helpers'

app.listen(4000)

// const server = http.createServer((req, res) => {
//   let requestBody = ''

//   req.on('data', chunk => {
//     requestBody += chunk
//   })

//   req.on('end', () => {
//     console.log('Received request body:', requestBody)
//     console.log(req.method)
//     console.log(JSON.stringify(req, null, 2))
//     res.statusCode = 200
//     res.setHeader('Content-Type', 'text/plain')
//     res.end('Hello, world!')
//   })
// })

// server.listen(4000, () => {
//   console.log('Server started and listening on port 4000')
// })

config()
;(async () => {
  const authFetch = await getAuthenticatedFetch({
    email: 'bot@example',
    password: 'password',
  })
  // authFetch can now be used as a standard fetch function that will authenticate as your WebID.
  // This request will do a simple GET for example.
  const response3 = await authFetch(
    'http://localhost:3000/.notifications/WebhookChannel2023/',
    {
      method: 'POST',
      body: JSON.stringify({
        '@context': ['https://www.w3.org/ns/solid/notification/v1'],
        type: 'http://www.w3.org/ns/solid/notifications#WebhookChannel2023',
        topic: 'http://localhost:3000/person/profile/card',
        sendTo: 'http://localhost:4000/webhook-receiver',
      }),
      headers: { 'content-type': 'application/ld+json' },
    },
  )

  console.log(await response3.text())

  const personAuthFetch = await getAuthenticatedFetch({
    email: 'person@example',
    password: 'password',
  })

  const inboxResponse = await personAuthFetch('http://localhost:4000/inbox', {
    method: 'POST',
    body: JSON.stringify({
      '@context': 'https://www.w3.org/ns/activitystreams',
      '@id': '',
      '@type': 'Add', // or "Remove"
      actor: 'http://localhost:3000/person/profile/card#me',
      object: 'inbox',
      target: 'email@example.com',
    }),
    headers: {
      'content-type':
        'application/ld+json;profile="https://www.w3.org/ns/activitystreams',
    },
  })

  console.log(inboxResponse.status, await inboxResponse.text())
})()
