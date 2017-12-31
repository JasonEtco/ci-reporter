const Travis = require('./providers/Travis')
const Circle = require('./providers/Circle')
const fs = require('fs')
const path = require('path')

// We already have an instance of handlebars from Probot's hbs dependency
const { handlebars } = require('hbs')
const template = handlebars.compile(fs.readFileSync(path.join(__dirname, 'template.md'), 'utf8'))

module.exports = robot => {
  robot.log('App has started!')

  robot.on('status', async context => {
    // Only trigger on failed statuses
    if (context.payload.state === 'failure') {
      let serializer

      const { context: statusContext } = context.payload

      if (statusContext === Travis.ctx) {
        serializer = new Travis(context)
      } else if (statusContext === Circle.ctx) {
        serializer = new Circle(context)
      } else {
        robot.log(`ctx does not exist: ${statusContext}`)
        return
      }

      // Will return false if something borks
      const serialized = await serializer.serialize()
      if (serialized) {
        const { number, data } = serialized
        const issue = { number, body: template(data) }
        return context.github.issues.createComment(context.repo(issue))
      }
    }
  })
}
