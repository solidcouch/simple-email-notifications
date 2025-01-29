import app from './app.js'
import { port } from './config/index.js'

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`mailer service is listening on port ${port}`)
})
