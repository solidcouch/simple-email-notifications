export const init = {
  type: 'object',
  properties: { email: { type: 'string', format: 'email' } },
  required: ['email'],
  additionalProperties: false,
}

export const notification = {
  type: 'object',
  properties: {
    '@context': { const: 'https://www.w3.org/ns/activitystreams' },
    id: { type: 'string' },
    type: { const: 'Create' },
    actor: {
      type: 'object',
      properties: {
        type: { const: 'Person' },
        id: { type: 'string', format: 'uri' },
        name: { type: 'string' },
      },
      required: ['type', 'id'],
    },
    object: {
      type: 'object',
      properties: {
        type: { const: 'Note' },
        id: { type: 'string', format: 'uri' },
        content: { type: 'string' },
      },
      required: ['type', 'id', 'content'],
    },
    target: {
      type: 'object',
      properties: {
        type: { const: 'Person' },
        id: { type: 'string', format: 'uri' },
        name: { type: 'string' },
      },
      required: ['type', 'id'],
    },
  },
  required: ['@context', 'type', 'actor', 'object', 'target'],
  additionalProperties: false,
}
