import { readFile } from 'fs-extra'
import { verify } from 'jsonwebtoken'
import type { DefaultContext, DefaultState, Middleware } from 'koa'
import * as config from '../config'
import { findEmailVerificationTokens } from '../utils'

export const getVerifiedEmails = async (webId: string) => {
  const tokens = await findEmailVerificationTokens(webId)

  const pem = await readFile(config.jwt.key, { encoding: 'utf-8' })

  const verifiedEmails = tokens
    .map(token => {
      try {
        return verify(token, pem) as {
          webId: string
          email: string
          emailVerified: boolean
          iss: string
          iat: number
        }
      } catch {
        return null
      }
    })
    .filter(a => a?.emailVerified && a.webId === webId)
    .map(a => a!.email)

  return verifiedEmails
}

export const getStatus: Middleware<
  DefaultState,
  DefaultContext & { params: { webId: string } }
> = async ctx => {
  const webId = ctx.params.webId

  const verifiedEmails = await getVerifiedEmails(webId)

  ctx.response.body = { emailVerified: verifiedEmails.length > 0 }
  ctx.response.status = 200
}
