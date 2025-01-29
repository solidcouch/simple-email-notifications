import { foaf, solid, space } from 'rdf-namespaces'
import { expect } from 'vitest'
import * as config from '../../config/index.js'
import { Person } from './types.js'

const createFile = async ({
  url,
  body,
  acl,
  authenticatedFetch,
}: {
  url: string
  body: string
  acl?: { read?: 'public' | string; write?: string; own: string }
  authenticatedFetch: typeof fetch
}) => {
  const response = await authenticatedFetch(url, {
    method: 'PUT',
    body,
    headers: { 'content-type': 'text/turtle' },
  })

  expect(response.ok).to.be.true

  if (acl) {
    await addAcl({
      permissions: ['Read', 'Write', 'Control'],
      agents: [acl.own],
      resource: url,
      authenticatedFetch,
    })

    if (acl?.read) {
      if (acl.read === 'public')
        await addAcl({
          permissions: ['Read'],
          agents: [],
          isPublic: true,
          resource: url,
          authenticatedFetch,
        })
      else
        await addAcl({
          permissions: ['Read'],
          agents: [acl.read],
          resource: url,
          authenticatedFetch,
        })
    }
    if (acl?.write)
      await addAcl({
        permissions: ['Write'],
        agents: [acl.write],
        resource: url,
        authenticatedFetch,
      })
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
  skipSettings = false,
}: {
  person: Person
  email: string
  emailVerificationToken: string
  authenticatedFetch: typeof fetch
  skipSettings?: boolean // this option is useful for testing email integration
}) => {
  // add email settings, readable by mailer
  const settings = skipSettings
    ? ''
    : `
  <${person.webId}>
    <${foaf.mbox}> "${email}";
    <${config.verificationTokenPredicate}> "${emailVerificationToken}".`
  const settingsPath = person.podUrl + 'hospex/email'

  await createFile({
    url: settingsPath,
    body: settings,
    acl: {
      read: config.mailerCredentials.webId,
      write: config.mailerCredentials.webId,
      own: person.webId,
    },
    authenticatedFetch,
  })

  // add hospex document with reference to email settings, readable by mailer
  const hospexDocument = `
  <${person.webId}> <${space.preferencesFile}> <${settingsPath}>.`
  const hospexDocumentPath = person.podUrl + 'hospex/test/card'

  await createFile({
    url: hospexDocumentPath,
    body: hospexDocument,
    acl: { read: config.mailerCredentials.webId, own: person.webId },
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
    acl: { read: 'public', own: person.webId },
    authenticatedFetch,
  })

  // add publicTypeIndex reference to webId document of person
  const profileDocumentPatch = `<${person.webId}> solid:publicTypeIndex <${publicTypeIndexPath}>.`

  await patchFile({
    url: person.webId,
    inserts: profileDocumentPatch,
    authenticatedFetch,
  })

  return {
    settings: settingsPath,
    hospexDocument: hospexDocumentPath,
    publicTypeIndex: publicTypeIndexPath,
  }
}

const addAcl = async ({
  permissions,
  agents,
  isPublic = false,
  resource,
  isDefault = false,
  authenticatedFetch,
}: {
  permissions: ('Read' | 'Write' | 'Append' | 'Control')[]
  agents: string[]
  isPublic?: boolean
  resource: string
  isDefault?: boolean
  authenticatedFetch: typeof fetch
}) => {
  if (permissions.length === 0)
    throw new Error('You need to specify at least one permission')
  const response = await authenticatedFetch(resource + '.acl', {
    method: 'PATCH',
    headers: { 'content-type': 'text/n3' },
    body: `
        @prefix acl: <http://www.w3.org/ns/auth/acl#>.

      _:mutate a <${solid.InsertDeletePatch}>; <${solid.inserts}> {
        <#${permissions.join('')}>
          a acl:Authorization;
          ${agents.length > 0 ? `acl:agent <${agents.join(', ')}>;` : ''}
          ${isPublic ? `acl:agentClass <${foaf.Agent}>;` : ''}
          acl:accessTo <${resource}>;
          ${isDefault ? `acl:default <${resource}>;` : ''}
          acl:mode ${permissions.map(p => `acl:${p}`).join(', ')}.
      }.`,
  })

  expect(response.ok).to.be.true

  return response
}
