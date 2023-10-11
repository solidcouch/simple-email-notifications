import { Middleware } from 'koa'
import { EmailVerification, Integration } from '../config/sequelize'

export const getStatus: Middleware = async ctx => {
  const webId = ctx.state.user

  const verified = await Integration.findAll({ where: { webId } })

  const unverified = await EmailVerification.findAll({ where: { webId } })

  ctx.response.body = {
    actor: webId,
    integrations: [
      ...verified.map(s => ({
        object: s.inbox,
        target: s.email,
        verified: true,
      })),
      ...unverified.map(s => ({
        object: s.inbox,
        target: s.email,
        verified: false,
      })),
    ],
  }
  ctx.response.status = 200
}
