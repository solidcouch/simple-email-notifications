import * as nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import * as path from 'path'
import { appLogo, smtpTransportOptions } from '../config'

export const sendMail = async (options: Mail.Options) => {
  const smtpTransport = nodemailer.createTransport(smtpTransportOptions)
  await smtpTransport.sendMail({
    ...options,
    attachments: [
      {
        filename: path.basename(appLogo),
        path: appLogo,
        cid: 'applogo@tired.bike',
      },
      ...(options.attachments ?? []),
    ],
  })
}
