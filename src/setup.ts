import { expect } from 'chai'
import { ldp, solid } from 'rdf-namespaces'

export const setupInbox = async ({
  webId,
  inbox,
  authenticatedFetch,
}: {
  webId: string
  inbox: string
  authenticatedFetch: typeof fetch
}) => {
  // create inbox
  const createInboxResponse = await authenticatedFetch(inbox, {
    method: 'PUT',
    headers: {
      link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
      'content-type': 'text/turtle',
    },
  })

  expect(createInboxResponse.ok).to.be.true

  const createInboxAclResponse = await authenticatedFetch(inbox + '.acl', {
    // this .acl is a shortcut, should find .acl properly TODO
    method: 'PUT',
    headers: { 'content-type': 'text/turtle' },
    body: `
      @prefix acl: <http://www.w3.org/ns/auth/acl#>.

      <#Append>
        a acl:Authorization;
        acl:agentClass acl:AuthenticatedAgent;
        acl:accessTo <./>;
        acl:default <./>;
        acl:mode acl:Append.
      <#ControlReadWrite>
        a acl:Authorization;
        acl:agent <${webId}>;
        acl:accessTo <./>;
        acl:default <./>;
        acl:mode acl:Control, acl:Read, acl:Write.
      `,
  })

  expect(createInboxAclResponse.ok).to.be.true

  const linkInboxResponse = await authenticatedFetch(webId, {
    method: 'PATCH',
    headers: { 'content-type': 'text/n3' },
    body: `
      _:mutate a <${solid.InsertDeletePatch}>; <${solid.inserts}> {
        <${webId}> <${ldp.inbox}> <${inbox}>.
      }.`,
  })

  expect(linkInboxResponse.ok).to.be.true
}

/**
 * Give agent a read access (e.g. to inbox)
 *
 * Currently assumes we're changing rights to container!
 */
export const addRead = async ({
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
