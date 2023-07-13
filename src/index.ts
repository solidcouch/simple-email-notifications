import { config } from 'dotenv'

config()

/** Here we run the code */
;(async () => {
  /** This is how you use environment variables e.g. defined in .env */
  const who: string = process.env.hello ?? 'World'

  console.log(
    `Hello ${who}!\n\nRename this project and start coding from ./src/index.ts\n\nHappy developing!`,
  )
})()
