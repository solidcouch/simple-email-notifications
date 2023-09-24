# Solid email notifications

This service sends an email when a new notification arrives to your Solid Pod inbox

## How it will work

- It will be a bot agent and it will run on some server
- You'll have to give it Read access to your inbox (how does bot get an access?)
- You'll have to prove that the inbox belongs to you (how to prove that?)
- You'll have to tell it where to send you emails
- It'll subscribe to Solid [webhook](https://solid.github.io/notifications/webhook-channel-2023) [notifications](https://solidproject.org/TR/notifications-protocol) of your inbox
- When a notification arrives to your inbox, this agent will get notified by the webhook. It will check whether it's a notification about something specific (in the context of sleepy.bike e.g. message or contact request), it'll compose the message and send it to you
- It will regularly re-subscribe to your inbox because some Solid pods drop the subscription regularly
- If your pod doesn't support webhook notifications, maybe this bot will check your inbox regularly (a few times per day) and send you a notification when it finds something new there

## Usage

### Configure

To authenticate itself, the mailer needs to have its own identity, it can be identity hosted on some Community Solid Server

Copy `.env.sample` to `.env` and edit the latter according to your needs

### Run

```sh
yarn start
```

### Use

TODO

## Tests

Run `yarn test`

Tests are placed in [src/test/](./src/test/)

## License

MIT
