# Simple Solid email notifications

This service sends email from one person within a Solid group to another. It doesn't use native Solid notifications, because there are pods that don't support it.

## How it works

- It's a bot agent with its own identity, which must be provided by arbitrary CommunitySolidServer pod
- It runs on a server
- You can check whether another person in the group has set up email notifications.
- If the other person has set up the notifications, you can send them an email through this service.
- At the beginning, you need to verify your email, save it into your hospitality exchange settings, and give the mailer a permission to read the email; so the email notifier can access the settings when it sends you an email.
- When you want to notify other person, the service will check whether both of you belong to the specified group(s). If you both belong, and the other person has email notifications set up, it will send the other person an email.

## Usage

### Configure

To authenticate itself, the mailer needs to have its own identity, it can be identity hosted on some Community Solid Server

Copy `.env.sample` to `.env` and edit the latter according to your needs

Alternatively, you may provide the configuration as environment variables

You can find full list of config options in [.env.sample](./.env.sample)

### Run

```sh
yarn start
```

### Use

Service API is documented in [OpenAPI schema](./apidocs/openapi.json) (still work in progress). When you run the app with `yarn start`, you'll see the Swagger-UI documentation at `/`.

## Tests

Run `yarn test`

Tests are placed in [src/test/](./src/test/)

## License

MIT
