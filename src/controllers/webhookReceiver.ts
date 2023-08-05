import { Middleware } from 'koa'
import { Integration } from '../config/sequelize'
import { sendMail } from '../services/mailerService'

export const webhookReceiver: Middleware = async ctx => {
  if (ctx.request.body.type !== 'Add')
    return ctx.throw(400, "The item wasn't added")

  // TODO check that the added item actually exists and check whether we care about it

  // find email address for the inbox
  const integration = await Integration.findOne({
    where: { inbox: ctx.request.body.target },
  })

  if (!integration)
    return ctx.throw(
      404,
      "Notification not integrated (we don't know where to send a notification)",
    )

  await sendMail({
    to: integration.email,
    subject: 'TODO',
    html: 'TODO',
    text: 'TODO',
  })
  ctx.response.status = 202
  ctx.response.body = 'Accepted'
}
