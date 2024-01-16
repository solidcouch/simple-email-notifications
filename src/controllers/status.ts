import { RdfQuery } from '@ldhop/core/dist/src'
import { QueryAndStore } from '@ldhop/core/dist/src/QueryAndStore'
import { fetchRdfDocument } from '@ldhop/core/dist/src/utils/helpers'
import { getAuthenticatedFetch as getAuthenticatedFetch6x } from 'css-authn/dist/6.x'
import { getAuthenticatedFetch as getAuthenticatedFetch7x } from 'css-authn/dist/7.x'
import { readFile } from 'fs-extra'
import { verify } from 'jsonwebtoken'
import type { DefaultContext, DefaultState, Middleware } from 'koa'
import { NamedNode, Quad } from 'n3'
import { dct, rdfs, solid, space } from 'rdf-namespaces'
import * as config from '../config'

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

/**
 * To find verified email of a person
 *
 * - Go to person's webId
 * - Find public type index `(webId) - solid:publicTypeIndex -> (publicTypeIndex)``
 * - Find instances of specific class defined in config (EMAIL_DISCOVERY_TYPE defaults to hospex:PersonalHospexDocument)
 * - Find settings in the relevant instance (webId) - space:preferencesFile -> (settings)
 * - In the settings, find (webId) - example:emailVerificationToken -> (JWT)
 */
const findEmailQuery: RdfQuery = [
  // Go to person's webId and fetch extended profile documents, too
  {
    type: 'match',
    subject: '?person',
    predicate: rdfs.seeAlso,
    pick: 'object',
    target: '?extendedDocument',
  },
  { type: 'add resources', variable: '?extendedDocument' },
  // Find public type index
  {
    type: 'match',
    subject: '?person',
    predicate: solid.publicTypeIndex,
    pick: 'object',
    target: '?publicTypeIndex',
  },
  // Find instances of specific class defined in config (EMAIL_DISCOVERY_TYPE)
  {
    type: 'match',
    subject: '?publicTypeIndex',
    predicate: dct.references,
    pick: 'object',
    target: '?typeRegistration',
  },
  {
    type: 'match',
    subject: '?typeRegistration',
    predicate: solid.forClass,
    object: config.emailDiscoveryType,
    pick: 'subject',
    target: '?typeRegistrationForClass',
  },
  {
    type: 'match',
    subject: '?typeRegistrationForClass',
    predicate: solid.instance,
    pick: 'object',
    target: `?classDocument`,
  },
  { type: 'add resources', variable: '?classDocument' },
  // Find settings
  {
    type: 'match',
    subject: '?person',
    predicate: space.preferencesFile,
    pick: 'object',
    target: '?settings',
  },
  { type: 'add resources', variable: '?settings' },
]

const findEmailVerificationTokens = async (webId: string) => {
  // initialize knowledge graph and follow your nose through it
  // according to the query
  const qas = new QueryAndStore(findEmailQuery, { person: new Set([webId]) })
  await run(qas)

  // Find email verification tokens
  const objects = qas.store.getObjects(
    new NamedNode(webId),
    new NamedNode('https://example.com/emailVerificationToken'),
    null,
  )

  return objects.map(o => o.value)
}

const fetchRdf = async (uri: string) => {
  const getAuthenticatedFetch =
    config.mailerCredentials.cssVersion === 6
      ? getAuthenticatedFetch6x
      : getAuthenticatedFetch7x
  const authBotFetch = await getAuthenticatedFetch(config.mailerCredentials)

  const { data: quads } = await fetchRdfDocument(uri, authBotFetch)

  return quads
}

/**
 * Follow your nose through the linked data graph by query
 */
const run = async (qas: QueryAndStore) => {
  let missingResources = qas.getMissingResources()

  while (missingResources.length > 0) {
    let quads: Quad[] = []
    const res = missingResources[0]
    try {
      quads = await fetchRdf(missingResources[0])
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    } finally {
      qas.addResource(res, quads)
      missingResources = qas.getMissingResources()
    }
  }
}
