module.exports = async (context, number) => {
  const comments = await context.github.issues.getComments(context.issue({ number }))
  const comment = comments.data.find(comment => comment.user.login === process.env.APP_NAME + '[bot]')
  return comment
}
