import { expect } from 'chai'
import { foaf, solid, space } from 'rdf-namespaces'
import * as config from '../../config'
import { Person } from './types'

const createFile = async ({
  url,
  body,
  acl,
  authenticatedFetch,
}: {
  url: string
  body: string
  acl?: { read?: 'public' | string }
  authenticatedFetch: typeof fetch
}) => {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body,
    headers: { 'content-type': 'text/turtle' },
  })

  expect(response.ok).to.be.true

  if (acl && acl.read) {
    if (acl.read === 'public')
      await addPublicRead({ resource: url, authenticatedFetch })
    else await addRead({ resource: url, agent: acl.read, authenticatedFetch })
  }
}

const patchFile = async ({
  url,
  inserts = '',
  deletes = '',
  authenticatedFetch,
}: {
  url: string
  inserts?: string
  deletes?: string
  authenticatedFetch: typeof fetch
}) => {
  if (!inserts && !deletes) return
  const patch = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.

  _:patch a solid:InsertDeletePatch;
    ${inserts ? `solid:inserts { ${inserts} }` : ''}
    ${inserts && deletes ? ';' : ''}
    ${deletes ? `solid:deletes { ${deletes} }` : ''}
    .`
  const response = await authenticatedFetch(url, {
    method: 'PATCH',
    body: patch,
    headers: { 'content-type': 'text/n3' },
  })
  expect(response.ok).to.be.true
}

/**
 * Setup email settings in person's pod
 */
export const setupEmailSettings = async ({
  person,
  email,
  emailVerificationToken,
  authenticatedFetch,
}: {
  person: Person
  email: string
  emailVerificationToken: string
  authenticatedFetch: typeof fetch
}) => {
  // add email settings, readable by mailer
  const settings = `
  <${person.webId}>
    <${foaf.mbox}> "${email}";
    <https://example.com/emailVerificationToken> "${emailVerificationToken}".`
  const settingsPath = person.podUrl + 'hospex/email'

  await createFile({
    url: settingsPath,
    body: settings,
    acl: { read: config.mailerCredentials.webId },
    authenticatedFetch,
  })

  // add hospex document with reference to email settings, readable by mailer
  const hospexDocument = `
  <${person.webId}> <${space.preferencesFile}> <${settingsPath}>.`
  const hospexDocumentPath = person.podUrl + 'hospex/test/card'

  await createFile({
    url: hospexDocumentPath,
    body: hospexDocument,
    acl: { read: config.mailerCredentials.webId },
    authenticatedFetch,
  })

  // add public type index with reference to hospex document, public
  const publicTypeIndex = `
  @prefix solid: <http://www.w3.org/ns/solid/terms#>.

  <> a solid:TypeIndex, solid:ListedDocument;
    <http://purl.org/dc/terms/references> <#hospex>.
    <#hospex> a solid:TypeRegistration;
      solid:forClass <http://w3id.org/hospex/ns#PersonalHospexDocument>;
      solid:instance <${hospexDocumentPath}> .`
  const publicTypeIndexPath = person.podUrl + 'settings/publicTypeIndex.ttl'

  await createFile({
    url: publicTypeIndexPath,
    body: publicTypeIndex,
    acl: { read: 'public' },
    authenticatedFetch,
  })

  // add publicTypeIndex reference to webId document of person
  const profileDocumentPatch = `<${person.webId}> solid:publicTypeIndex <${publicTypeIndexPath}>.`

  await patchFile({
    url: person.webId,
    inserts: profileDocumentPatch,
    authenticatedFetch,
  })
}

/**
 * Give agent a read access (e.g. to inbox)
 *
 * Currently assumes we're changing rights to container!
 */
const addRead = async ({
  resource,
  agent,
  authenticatedFetch,
}: {
  resource: string
  agent: string
  authenticatedFetch: typeof fetch
}) => {
  const response = await authenticatedFetch(resource + '.acl', {
    method: 'PATCH',
    headers: { 'content-type': 'text/n3' },
    body: `
        @prefix acl: <http://www.w3.org/ns/auth/acl#>.

      _:mutate a <${solid.InsertDeletePatch}>; <${solid.inserts}> {
        <#Read>
          a acl:Authorization;
          acl:agent <${agent}>;
          acl:accessTo <${resource}>;
          acl:default <${resource}>;
          acl:mode acl:Read.
      }.`,
  })

  expect(response.ok).to.be.true

  return response
}

const addPublicRead = async ({
  resource,
  authenticatedFetch,
}: {
  resource: string
  authenticatedFetch: typeof fetch
}) => {
  const response = await authenticatedFetch(resource + '.acl', {
    method: 'PATCH',
    headers: { 'content-type': 'text/n3' },
    body: `
        @prefix acl: <http://www.w3.org/ns/auth/acl#>.

      _:mutate a <${solid.InsertDeletePatch}>; <${solid.inserts}> {
        <#Read>
          a acl:Authorization;
          acl:agentClass <http://xmlns.com/foaf/0.1/Agent>;
          acl:accessTo <${resource}>;
          acl:mode acl:Read.
      }.`,
  })

  expect(response.ok).to.be.true

  return response
}
