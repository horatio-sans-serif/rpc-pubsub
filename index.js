const _ = require('lodash')
const shortid = require('shortid')
const EventEmitter = require('events')

module.exports = function configurePUBSUB (redis, options = {}) {
  const localServerId = options.serverId || shortid()
  const localSubs = {}

  const emitter = new EventEmitter()

  function sendToLocalSubs(channel, alias, data) {
    const timestamp = _.now() / 1000 | 0
    const toSend = JSON.stringify({ module: 'pubsub', type: 'message', timestamp, channel, alias, data })
    _.each(localSubs[channel] || {}, socket => socket.send(toSend))
  }

  function sendToRemoteSubs(channel, alias, data) {
    redis.publish(channel, JSON.stringify({
      serverId: localServerId, channel, alias, data
    }))
  }

  const subRedis = redis.duplicate()

  subRedis.on('message', (channel, message) => {
    try {
      message = JSON.parse(message)
      if (message.serverId !== localServerId)
        sendToLocalSubs(channel, message.alias, message.data)
    } catch (err) {
      console.error('redis error', err)
    }
  })

  function subscribe({channel}) {
    return new Promise((resolve, reject) => {
      if (!this.clientId || !this.alias)
        return reject('authentication required')

      subRedis.subscribe(channel)
      _.set(localSubs, `${channel}.${this.clientId}`, socket)
      _.set(this, `channels.${channel}`, true)

      resolve()
    })
  }

  function unsubscribe({channel}) {
    return new Promise((resolve, reject) => {
      if (!this.clientId || !this.alias)
        return reject('authentication required')

      _.unset(socket.channels, channel)
      _.unset(localSubs, `${channel}.${this.clientId}`)

      if (_.isEmpty(localSubs[channel])) {
        _.unset(localSubs, channel)
        subRedis.unsubscribe(channel)
      }

      resolve()
    })
  }

  function publish({channel, data}) {
    return new Promise((resolve, reject) => {
      if (!this.clientId || !this.alias)
        return reject('authentication required')

      sendToLocalSubs(channel, this.clientId, data)
      sendToRemoteSubs(channel, this.clientId, data)

      resolve()
    })
  }

  return {
    subscribe,
    unsubscribe,
    publish,
    disconnected: (client) => {
      _.each(client.channels, channel => unsubscribe.call(client, {channel}))
    },
    emitter
  }
}
