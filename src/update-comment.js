async function updateComment ({context, template, data, sha, number, comment, after, before}) {
  const lastCommit = /<!--LAST_COMMIT=(.+)-->/g.exec(comment.body)[1]
  const lastLog = /<!--START_LOG-->([\s\S]+)<!--END_LOG-->/g.exec(comment.body)[1]
  const oldLogs = /<!--START_OLD_LOGS-->([\s\S]+)<!--END_OLD_LOGS-->/g.exec(comment.body)[1]

  const body = template({
    ...data,
    commit: sha,
    oldLogs,
    lastLog,
    lastCommit: lastCommit.substring(0, 7),
    before,
    after
  })

  return context.github.issues.editComment(context.repo({ number, body, id: comment.id }))
}

module.exports = updateComment
