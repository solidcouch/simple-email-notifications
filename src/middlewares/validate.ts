import addFormats from 'ajv-formats'
import Ajv2020 from 'ajv/dist/2020'
import type { Middleware } from 'koa'

const ajv = new Ajv2020({ allErrors: true })
addFormats(ajv)

/**
 * This middleware generator accepts json-schema and returns Middleware
 * It checks that request body matches the given schema,
 * and responds with 400, and validation errors if schema is not satisfied
 * The response data detail contains raw validation errors that ajv provides
 * maybe TODO: return nicer (more human-readable) validation errors
 */
export const validateBody =
  (schema: Parameters<typeof ajv.compile>[0]): Middleware =>
  async (ctx, next) => {
    const validate = ajv.compile(schema)
    const isValid = validate(ctx.request.body)

    if (isValid) return await next()
    else {
      ctx.response.status = 400
      ctx.response.type = 'json'
      ctx.response.body = {
        message: 'Invalid data',
        detail: validate.errors,
      }
    }
  }
