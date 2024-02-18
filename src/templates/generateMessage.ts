import * as fs from 'fs-extra'
import Handlebars from 'handlebars'
import juice from 'juice'
import path from 'path'

export const generateHtmlMessage = async <T>(type: string, data: T) => {
  const layout = await fs.readFile(path.join(__dirname, 'layout.hbs'), 'utf8')
  const layoutTemplate = Handlebars.compile(layout)
  const content = await fs.readFile(path.join(__dirname, `${type}.hbs`), 'utf8')
  const contentTemplate = Handlebars.compile<T>(content)

  const compiledContent = contentTemplate(data)
  const emailHtml = layoutTemplate({ title: 'asdf', body: compiledContent })
  const emailHtmlInlineCss = juice(emailHtml)

  return emailHtmlInlineCss
}
