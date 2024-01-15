import { Middleware } from 'koa'
import { Parser } from 'n3'
import { vcard } from 'rdf-namespaces'

export const authorizeGroups =
  (groups: string[]): Middleware =>
  async (ctx, next) => {
    // if array of groups are empty, we allow everybody (default)
    if (groups.length === 0) return await next()

    const user = <string>ctx.state.user

    const memberships = await Promise.allSettled(
      groups.map(group => isGroupMember(user, group)),
    )

    const isAllowed = memberships.some(
      membership =>
        membership.status === 'fulfilled' && membership.value === true,
    )

    if (!isAllowed) {
      return ctx.throw(
        403,
        'Authenticated user is not a member of any allowed group',
      )
    }

    await next()
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
