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

      const { context: statusContext, sha } = context.payload

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

        // Determine if there is already a comment on this PR from ci-reporter
        const comments = await context.github.issues.getComments(context.issue({ number }))
        const comment = comments.data.find(comment => comment.user.login === process.env.APP_NAME + '[bot]')

        // If there is, edit that one
        if (comment) {
          const lastCommit = /<!--LAST_COMMIT=(.+)-->/g.exec(comment.body)[1]
          const lastLog = /<!--START_LOG-->([\s\S]+)<!--END_LOG-->/g.exec(comment.body)[1]
          const oldLogs = /<!--START_OLD_LOGS-->([\s\S]+)<!--END_OLD_LOGS-->/g.exec(comment.body)[1]
          const body = template({...data, commit: sha, oldLogs, lastLog, lastCommit: lastCommit.substring(0, 7)})
          return context.github.issues.editComment(context.repo({ number, body, id: comment.id }))
        } else {
          // If there is not, create one
          const body = template({...data, commit: sha})
          const issue = { number, body }
          return context.github.issues.createComment(context.repo(issue))
        }
      }
    }
  })
}
