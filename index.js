const probot = require('probot-ts')
const bot = probot(require('./env.json'))

/**
 * Relay GitHhub events to the bot
 */
exports.bot = (request, response) => {
  const event = request.get('x-github-event') || request.get('X-GitHub-Event')
  console.log(`Received event ${event}${request.body.action ? ('.' + request.body.action) : ''}`)
  if (event) {
    try {
      bot.receive({
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
