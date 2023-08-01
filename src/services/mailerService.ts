import * as nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'

export const sendMail = async (options: Mail.Options) => {
  const smtpTransport = nodemailer.createTransport({ port: 1025 })
  await smtpTransport.sendMail(options)
}
