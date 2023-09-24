import app from './app'
import { port } from './config'

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`mailer service is listening on port ${port}`)
})
