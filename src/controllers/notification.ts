import { DefaultContext, Middleware } from 'koa'
import { appName, emailSender } from '../config/index.js'
import { sendMail } from '../services/mailerService.js'
import { generateHtmlMessage } from '../templates/generateMessage.js'
import { getVerifiedEmails } from './status.js'

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
    const subject = `${body.actor.name || 'Someone'} wrote you from ${appName}`

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
      subject,
      html: await generateHtmlMessage('message', {
        ...body,
        title: subject,
      }),
      text: body.object.content,
    })
  }
  ctx.response.status = 202
  ctx.response.body = 'Accepted'
}
