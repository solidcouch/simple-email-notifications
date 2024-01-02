import { createAccount } from 'css-authn/dist/7.x'
import * as uuid from 'uuid'

export const createRandomAccount = ({
  solidServer,
}: {
  solidServer: string
}) => {
  return createAccount({
    username: uuid.v4(),
    password: uuid.v4(),
    email: uuid.v4() + '@example.com',
    provider: solidServer,
  })
}
