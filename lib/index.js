const { Travis, Circle } = require('./providers')

module.exports = robot => {
  robot.log('App has started!')

  robot.on('status', async context => {
    // Only trigger on failed statuses
    if (context.payload.state === 'failure') {
      let serializer

      const { context: statusContext } = context.payload

      // Only trigger on PR (for now, will eventually support Push statuses)
      if (statusContext === Travis.ctx) {
        serializer = new Travis(context)
      } else if (statusContext === Circle.ctx) {
        serializer = new Circle(context)
      }

      const issue = await serializer.serialize()
      return context.github.issues.createComment(context.repo(issue))
    }
  })
}
