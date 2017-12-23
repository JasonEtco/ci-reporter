const { Travis } = require('./providers')

module.exports = robot => {
  robot.log('App has started!')

  robot.on('status', async context => {
    // Only trigger on failed statuses
    if (context.payload.state === 'failure') {
      let issue

      const { context: statusContext } = context.payload

      // Only trigger on PR (for now, will eventually support Push statuses)
      if (statusContext === Travis.ctx) {
        const travis = new Travis(context)
        issue = await travis.serialize()
      }

      return context.github.issues.createComment(context.repo(issue))
    }
  })
}
