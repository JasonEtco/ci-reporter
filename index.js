const createProbot = require('probot-ts')
const probot = createProbot(require('./env.json'))
const plugin = require('./dist')
probot.load(plugin.bot)

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
