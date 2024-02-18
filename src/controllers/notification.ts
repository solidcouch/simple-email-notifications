import { DefaultContext, Middleware } from 'koa'
import { appName, emailSender } from '../config'
import { sendMail } from '../services/mailerService'
import { generateHtmlMessage } from '../templates/generateMessage'
import { getVerifiedEmails } from './status'

export type GoodBody = {
  '@context': 'https://www.w3.org/ns/activitystreams'
  type: 'Create'
  actor: { type: 'Person'; id: string; name?: string }
  object: { type: 'Note'; id: string; content: string }
  target: { type: 'Person'; id: string; name?: string }
}

export const notification: Middleware<
  { user: string; client: string | undefined },
  DefaultContext & { request: { body: GoodBody } }
> = async ctx => {
  const body: GoodBody = ctx.request.body

  if (ctx.state.user !== body.actor.id)
    return ctx.throw(403, "You can't send notification as somebody else")

  // find email address
  const emails = await getVerifiedEmails(body.target.id)

  if (emails.length === 0)
    return ctx.throw(
      404,
      "Receiving person doesn't have available email address",
    )

  for (const email of emails) {
    await sendMail({
      from: {
        name: body.actor.name
          ? `${body.actor.name} (via ${appName})`
          : `${appName} notifications`,
        address: emailSender,
      },
      to: {
        name: body.target.name ?? '',
        address: email,
      },
      subject: `${body.actor.name || 'Someone'} wrote you from ${appName}`,
      html: await generateHtmlMessage('message', body),
      text: body.object.content,
    })
  }
  ctx.response.status = 202
  ctx.response.body = 'Accepted'
}
