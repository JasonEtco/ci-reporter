const request = require('request-promise-native')

class Circle {
  constructor (context) {
    this.context = context
  }

  static get ctx () {
    return 'continuous-integration/circle-ci/pr'
  }

  buildUri ({ owner, repo }, build) { return `https://circleci.com/api/v1.1/project/github/${owner}/${repo}/${build}` }

  async serialize () {
    // target_url looks like
    // https://circleci.com/gh/:owner/:repo/:number (see tests/fixtures/circle/build.json)
    const { target_url: targetUrl } = this.context.payload
    const build = /https:\/\/circleci\.com\/gh\/(?:.+?\/){2}(\d+)/g.exec(targetUrl)[1]

    const buildJson = JSON.parse(await request(this.buildUri(this.context.repo(), build)))

    const prUrl = buildJson.pull_requests[0].url
    const number = prUrl.substr(prUrl.lastIndexOf('/')).substr(1)

    const ret = { number: parseInt(number, 10) }

    const npmTestStep = buildJson.steps.find(step => step.name === 'npm test')

    const res = JSON.parse(await request(npmTestStep.actions[0].output_url))
    const content = res[0].message
    // const content = this.parseLog(res)
    ret.body = `:sparkles: Good work on this PR so far! :sparkles: Unfortunately, the [Circle CI build](${targetUrl}) is failing. Here's the output:\n\`\`\`\n${content}\n\`\`\`\nI'm sure you can fix it! If you need help, don't hesitate to ask a maintainer of the project!`

    return ret
  }
}

module.exports = Circle
