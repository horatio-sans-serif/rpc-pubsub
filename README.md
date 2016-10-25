A set of handlers for rpc-over-ws for PUBSUB using Redis' PUBSUB to scale out.

## Installation

    npm i --save rpc-pubsub

## Usage

    const Redis = require('ioredis')
    const redis = new Redis(process.env.REDIS_URL)
    const {publish, subscribe, unsubscribe, disconnected, emitter} = require('rpc-pubsub')(redis)

    const {server} = require('rpc-over-ws')({ publish, subscribe, unsubscribe })
    server.on('client-disconnect', client => disconnected(client))

## Handlers

Note that "this" (the remote client) must be authenticated already with
`.clientId` and `.alias` set before these handlers will work.

      subscribe({channel})       -> Promise<void>
      publish({channel, data})   -> Promise<void>
      unsubscribe({channel})     -> Promise<void>

## Notifications

Clients are sent the following JSON when a message is published to a channel
on which they are subscribed.

    {
      "module": "pubsub",
      "type": "message",
      "channel": string,
      "alias": string,
      "data": any,
      "timestamp": int
    }

## Events

- `subscribe` (client, channel)
- `unsubscribe` (client, channel)
- `publish` (client, channel, data)

## Notes

There is no store-and-forward. A client must be connected and subscribed
to be sent messages published to a channel.
