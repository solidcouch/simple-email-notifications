import { fetchRdfDocument, QueryAndStore, RdfQuery } from '@ldhop/core'
import { v6, v7 } from 'css-authn'
import { NamedNode, Quad } from 'n3'
import { rdf, rdfs, solid, space } from 'rdf-namespaces'
import * as config from './config/index.js'

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
  // Go to person's webId and fetch extended proimage documents, too
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
    predicate: rdf.type,
    object: solid.TypeRegistration,
    graph: '?publicTypeIndex',
    pick: 'subject',
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

/**
 * Search through person's storage and find email verification token in settings
 */
export const findEmailVerificationTokens = async (webId: string) => {
  // initialize knowledge graph and follow your nose through it
  // according to the query
  const qas = new QueryAndStore(findEmailQuery, { person: new Set([webId]) })
  await run(qas)

  // Find email verification tokens
  const objects = qas.store.getObjects(
    new NamedNode(webId),
    new NamedNode(config.verificationTokenPredicate),
    null,
  )

  return objects.map(o => o.value)
}

/**
 * Given a webId of person, find settings that the bot identity can write to
 */
export const findWritableSettings = async (webId: string) => {
  // initialize knowledge graph and follow your nose through it
  // according to the query
  const qas = new QueryAndStore(findEmailQuery, { person: new Set([webId]) })
  await run(qas)

  // get uris of settings
  const settings = qas.getVariable('settings')

  // find out which settings the bot can edit
  const authBotFetch = await getBotFetch()
  const results = await Promise.allSettled(
    settings.map(s => getAllowedAccess(s, authBotFetch)),
  )

  const writableSettings = settings.filter((setting, index) => {
    const result = results[index]
    return (
      result.status === 'fulfilled' &&
      (result.value.user.includes('write') ||
        result.value.user.includes('append'))
    )
  })

  return writableSettings
}

type Permission = 'read' | 'write' | 'append' | 'control'
type PermissionDict = {
  user: Permission[]
  public: Permission[]
}

/**
 * Parse WAC-Allow header
 * https://solid.github.io/web-access-control-spec/#wac-allow
 * user="append read write",public="read"
 */
const parseWACAllowHeader = (header: string): PermissionDict => {
  const result: PermissionDict = { user: [], public: [] }

  const entries = header.split(/,\s*/)

  for (const entry of entries) {
    const [key, value] = entry.split(/\s*=\s*/) as ['user' | 'public', string]
    result[key] = value.trim().replace(/"\s*/g, '').split(/\s+/) as Permission[]
  }

  return result
}

/**
 * Given url, find what kind of accesses current user has
 * and what kind of accesses public has
 *
 * This is done via WAC-Allow header
 * https://solid.github.io/web-access-control-spec/#wac-allow
 */
const getAllowedAccess = async (
  url: string,
  authenticatedFetch: typeof globalThis.fetch,
) => {
  const response = await authenticatedFetch(url, { method: 'head' })
  const header = response.headers.get('wac-allow')
  if (header === null)
    throw new Error('WAC-Allow header not found for resource ' + url)
  const permissions = parseWACAllowHeader(header)

  return permissions
}

/**
 * Get authenticated fetch for the notification bot identity defined in config
 */
export const getBotFetch = async () => {
  const getAuthenticatedFetch =
    config.mailerCredentials.cssVersion === 6
      ? v6.getAuthenticatedFetch
      : v7.getAuthenticatedFetch
  return await getAuthenticatedFetch(config.mailerCredentials)
}

/**
 * Fetch RDF document with notification bot identity, and return quads
 */
export const fetchRdf = async (uri: string) => {
  const authBotFetch = await getBotFetch()
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
