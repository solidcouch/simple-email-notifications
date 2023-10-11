import * as nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import { smtpTransportOptions } from '../config'

export const sendMail = async (options: Mail.Options) => {
  const smtpTransport = nodemailer.createTransport(smtpTransportOptions)
  await smtpTransport.sendMail(options)
}
