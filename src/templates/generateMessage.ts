import Handlebars from 'handlebars'
import juice from 'juice'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as config from '../config/index.js'

Handlebars.registerHelper('encodeURIComponent', encodeURIComponent)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type LayoutData = {
  appName?: string
  appLogo?: string
  supportEmail?: string
  title?: string
}

export const generateHtmlMessage = async <T>(
  type: string,
  data: T & LayoutData,
) => {
  const layout = await fs.readFile(path.join(__dirname, 'layout.hbs'), 'utf8')
  const layoutTemplate = Handlebars.compile(layout)
  const content = await fs.readFile(path.join(__dirname, `${type}.hbs`), 'utf8')
  const contentTemplate = Handlebars.compile<T>(content)
  const stylesheet = await fs.readFile(
    path.join(__dirname, 'styles.css'),
    'utf8',
  )

  const {
    appName = config.appName,
    appLogo = config.appLogo,
    supportEmail = config.supportEmail,
    title = '',
  } = data

  const compiledContent = contentTemplate({
    ...data,
    appName,
    appLogo,
    title,
  })
  const emailHtml = layoutTemplate({
    title,
    appName,
    appLogo,
    supportEmail,
    body: compiledContent,
  })
  const emailHtmlInlineCss = juice(emailHtml, { extraCss: stylesheet })

  return emailHtmlInlineCss
}
