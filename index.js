const createProbot = require('probot-ts')
const fs = require('fs')
const { bot } = require('./dist')

const settings = require('./env.json')
settings.cert = fs.readFileSync('private-key.pem', 'utf8')
process.env.APP_NAME = settings.APP_NAME

const probot = createProbot(settings)

// Creates a Bunyan Stackdriver Logging client
const LoggingBunyan = require('@google-cloud/logging-bunyan')
const loggingBunyan = new LoggingBunyan()
probot.logger.addStream(loggingBunyan.stream())

probot.load(bot)

/**
 * Relay GitHub events to the bot
 */
exports.bot = (request, response) => {
  const event = request.get('x-github-event') || request.get('X-GitHub-Event')
  console.log(`Received event ${event}${request.body.action ? ('.' + request.body.action) : ''}`)
  if (event) {
    try {
      probot.receive({
        event: event,
        payload: request.body
      }).then(() => {
        response.send({
          statusCode: 200,
          body: JSON.stringify({
            message: 'Executed'
          })
        })
      })
    } catch (err) {
      console.error(err)
      response.sendStatus(500)
    }
  } else {
    console.error(request)
    response.sendStatus(400)
  }
}
