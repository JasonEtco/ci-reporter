const jwt = require('jsonwebtoken')
const Travis = require('./providers/Travis')
const Circle = require('./providers/Circle')
const defaultConfig = require('./default-config.json')
const newComment = require('./new-comment')
const updateComment = require('./update-comment')
const { cert } = require('../env.json')

// We already have an instance of handlebars from Probot's hbs dependency
const { handlebars } = require('hbs')
const template = handlebars.compile(require('./template'))

function getToken (type, config) {
  if (config.tokens[type]) {
    try {
      return jwt.verify(config.tokens[type], cert)
    } catch (e) {}
  }
  return false
}

module.exports = robot => {
  robot.on('status', async context => {
    const { owner, repo } = context.repo()

    // Only trigger on failed statuses
    if (context.payload.state === 'failure') {
      let serializer, tokenType
      const config = await context.config('ci-reporter.yml', defaultConfig)

      const { context: statusContext, sha } = context.payload

      switch (statusContext) {
        case Travis.ctx:
          context.log(`Creating TravisCI instance for ${context.id}`)
          tokenType = 'travis'
          serializer = new Travis(context, getToken(tokenType, config))
          break
        case Circle.ctx:
          context.log(`Creating CircleCI instance for ${context.id}`)
          tokenType = 'circle'
          serializer = new Circle(context, getToken(tokenType, config))
          break
        default:
          context.log(`ctx does not exist: ${statusContext}`)
          return
      }

      if (context.payload.repository.private && !config.tokens[tokenType]) {
        context.log(`Private repo ${owner}/${repo} does not have an API key for ${tokenType}`)
        return
      }

      // Will return false if something borks
      const serialized = await serializer.serialize()
      if (serialized) {
        const { number, data } = serialized

        const opts = {
          context,
          template,
          data,
          sha,
          number,
          after: config.after && handlebars.compile(config.after)({...data, commit: sha}),
          before: config.before && handlebars.compile(config.before)({...data, commit: sha})
        }

        if (config.updateComment) {
          // Determine if there is already a comment on this PR from ci-reporter
          const comments = await context.github.issues.getComments(context.issue({ number }))
          const comment = comments.data.find(comment => comment.user.login === process.env.APP_NAME + '[bot]')

          // If there is, edit that one
          if (comment) {
            opts.comment = comment
            context.log(`Updating comment ${owner}/${repo} #${number}`)
            return updateComment(opts)
          }
        }

        context.log(`Creating comment ${owner}/${repo} #${number}`)
        return newComment(opts)
      }
    }
  })
}
