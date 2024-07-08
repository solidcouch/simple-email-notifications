# Simple Solid email notifications

This service sends email from one person within a Solid group to another. It doesn't use native Solid notifications, because there are pods that don't support them.

## How it works

- It's a bot agent with its own identity, which must be provided by arbitrary [CommunitySolidServer](https://github.com/CommunitySolidServer/CommunitySolidServer) pod
- It runs on a server
- You can check whether another person in the group has set up email notifications.
- If the other person has set up the notifications, you can send them an email through this service.
- At the beginning, you need to verify your email, save it into your hospitality exchange settings, and give the mailer a permission to read the email; so the email notifier can access the settings when it sends you an email.
- When you want to notify other person, the service will check whether both of you belong to the specified group(s). If you both belong, and the other person has email notifications set up, it will send the other person an email.

### Verified email address discovery

Email address and verification token should be stored in (webId) - space:preferencesFile -> (email settings file) to which the mailer identity has read (and maybe write) access. It can be in the main webId file, or it can be in some document discovered via publicTypeIndex. In case of hospitality exchange, it can be in hospex:PersonalHospexDocument.

1. Go to person's webId
1. Find public type index `(webId) - solid:publicTypeIndex -> (publicTypeIndex)``
1. Find instances of hospex:PersonalHospexDocument
1. Find settings in the relevant instance (webId) - space:preferencesFile -> (settings)
1. In the settings, find (webId) - foaf:mbox -> (email) and (webId) - example:emailVerificationToken -> (JWT)

## Usage

### Configure

To authenticate itself, the mailer needs to have its own identity, it can be identity hosted on some Community Solid Server

Copy `.env.sample` to `.env` and edit the latter according to your needs.

_:warning: If you provide URIs with `#``, put them to `""`, otherwise # may be interpreted as comment!_

Alternatively, you may provide the configuration as environment variables

You can find full list of config options in [.env.sample](./.env.sample)

### Provide private key for JWT

You must provide a path to a private key for signing and verifying JWT tokens in `.env` file. You can generate it:

```
openssl ecparam -name prime256v1 -genkey -noout -out ecdsa-p256-private.pem
```

Default algorithm is ES256, but you can specify a different one.

### Run

Install for production:

```sh
yarn install --frozen-lockfile --production
```

Run:

```sh
yarn start
```

### Use

Service API is documented in [OpenAPI schema](./apidocs/openapi.json) (still work in progress). When you run the app with `yarn start`, you'll see the Swagger-UI documentation at `/`.

## Tests

Install for development:

```sh
yarn install --frozen-lockfile
```

Run:

```sh
yarn test
```

Tests are placed in [src/test/](./src/test/)

## License

MIT
