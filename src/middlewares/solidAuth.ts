import type {
  RequestMethod,
  SolidTokenVerifierFunction,
} from '@solid/access-token-verifier'
import * as verifier from '@solid/access-token-verifier'
import type { Middleware } from 'koa'

export const solidAuth: Middleware = async (ctx, next) => {
  const authorizationHeader = ctx.request.headers.authorization
  const dpopHeader = ctx.request.headers.dpop
  const solidOidcAccessTokenVerifier: SolidTokenVerifierFunction =
    verifier.createSolidTokenVerifier()

  try {
    const { client_id: clientId, webid: webId } =
      await solidOidcAccessTokenVerifier(authorizationHeader as string, {
        header: dpopHeader as string,
        method: ctx.request.method as RequestMethod,
        url: ctx.request.URL.toString(),
      })

    ctx.state.user = webId
    ctx.state.client = clientId
  } catch (error: unknown) {
    const message = `Error verifying Access Token via WebID: ${
      (error as Error).message
    }`

    ctx.throw(401, message)
  }

  // on success continue
  return await next()
}
