import {
  buildAuthenticatedFetch,
  createDpopHeader,
  generateDpopKeyPair,
} from '@inrupt/solid-client-authn-core'
import { expect } from 'chai'
import fetch from 'cross-fetch'
import * as uuid from 'uuid'

type Credentials = { email: string; password: string }

export const getAuthenticatedFetch = async ({
  email,
  password,
  solidServer,
}: Credentials & { solidServer: string }) => {
  const response = await fetch(`${solidServer}/idp/credentials/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // The email/password fields are those of your account.
    // The name field will be used when generating the ID of your token.
    body: JSON.stringify({ email, password, name: 'token' }),
  })

  const { id, secret } = await response.json()

  const dpopKey = await generateDpopKeyPair()

  // These are the ID and secret generated in the previous step.
  // Both the ID and the secret need to be form-encoded.
  const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`
  // This URL can be found by looking at the "token_endpoint" field at
  // http://localhost:3000/.well-known/openid-configuration
  // if your server is hosted at http://localhost:3000/.
  const tokenUrl = `${solidServer}/.oidc/token`
  const response2 = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      // The header needs to be in base64 encoding.
      authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
      dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
    },
    body: 'grant_type=client_credentials&scope=webid',
  })

  // This is the Access token that will be used to do an authenticated request to the server.
  // The JSON also contains an "expires_in" field in seconds,
  // which you can use to know when you need request a new Access token.
  const { access_token: accessToken } = await response2.json()

  // The DPoP key needs to be the same key as the one used in the previous step.
  // The Access token is the one generated in the previous step.
  const authFetch = await buildAuthenticatedFetch(fetch, accessToken, {
    dpopKey,
  })
  // authFetch can now be used as a standard fetch function that will authenticate as your WebID.

  return authFetch
}

export const createAccount = async ({
  username,
  password,
  email,
  solidServer,
}: {
  username: string
  password?: string
  email?: string
  solidServer: string
}) => {
  password ??= 'correcthorsebatterystaple'
  email ??= username + '@example.org'
  const config = {
    idp: solidServer + '/',
    podUrl: `${solidServer}/${username}/`,
    webId: `${solidServer}/${username}/profile/card#me`,
    username,
    password,
    email,
  }
  const registerEndpoint = solidServer + '/idp/register/'
  const response = await fetch(registerEndpoint, {
    method: 'post',
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
      createWebId: true,
      register: true,
      createPod: true,
      rootPod: false,
      podName: username,
    }),
    headers: { 'content-type': 'application/json' },
  })

  expect(response.ok).to.be.true

  return config
}

export const createRandomAccount = ({
  solidServer,
}: {
  solidServer: string
}) => {
  return createAccount({
    username: uuid.v4(),
    password: uuid.v4(),
    email: uuid.v4() + '@example.com',
    solidServer,
  })
}
