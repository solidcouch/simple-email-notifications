import { Middleware } from 'koa'
import { get } from 'lodash'
import { Parser } from 'n3'
import { vcard } from 'rdf-namespaces'

export const authorizeGroups = (
  groups: string[],
): Middleware<{ user: string }> =>
  checkGroupMembership(
    groups,
    'state.user',
    403,
    'Authenticated user is not a member of any allowed group',
  )

const isSomeGroupMember = async (user: string, groups: string[]) => {
  const memberships = await Promise.allSettled(
    groups.map(group => isGroupMember(user, group)),
  )

  const isMember = memberships.some(
    membership =>
      membership.status === 'fulfilled' && membership.value === true,
  )
  return isMember
}

/**
 * Check whether a user specified in param is member of any of the given groups
 */
export const checkGroupMembership =
  (
    groups: string[],
    path: string,
    status: number,
    error = 'Person is not a member of any allowed group',
  ): Middleware =>
  async (ctx, next) => {
    // if array of groups are empty, we allow everybody (default)
    if (groups.length === 0) return await next()
    const webId = get(ctx, path)
    if (typeof webId !== 'string')
      throw new Error('Expected string, got ' + typeof webId)
    const isAllowed = await isSomeGroupMember(webId, groups)

    if (!isAllowed) {
      return ctx.throw(status, error)
    } else await next()
  }

const isGroupMember = async (user: string, group: string) => {
  const groupDocumentResponse = await fetch(group)
  if (!groupDocumentResponse.ok) return false
  const groupDocument = await groupDocumentResponse.text()

  const parser = new Parser({ baseIRI: group })

  return await new Promise<boolean>((resolve, reject) => {
    parser.parse(groupDocument, (error, quad) => {
      if (error) return reject(error)

      // finished without finding the membership
      if (!quad) return resolve(false)

      // is the quad expressing the searched membership?
      if (
        quad.subject.value === group &&
        quad.predicate.value === vcard.hasMember &&
        quad.object.value === user
      )
        return resolve(true)
    })
  })
}
