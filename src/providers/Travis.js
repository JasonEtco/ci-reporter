const request = require('request-promise-native')

class Travis {
  constructor (context) {
    this.context = context
  }

  static get ctx () {
    return 'continuous-integration/travis-ci/pr'
  }

  buildUri (build) { return `https://api.travis-ci.org/build/${build}` }
  logUri (job) { return `https://api.travis-ci.org/job/${job}/log` }

  parseLog (log) {
    // sp00ky RegExp to start the extraction
    const reg = /(\[0K\$\s)(?![\s\S]+\1)(.+)(?:\r\n|\n)*([\s\S]+)[\r\n]+.*Test failed\./g
    const result = reg.exec(log)

    const command = result[2]
    let content = result[3].trim()
    return { command, content }
  }

  async serialize () {
    const headers = { 'Travis-API-Version': 3 }

    const { target_url: targetUrl } = this.context.payload
    const build = /\/builds\/(\d+)/g.exec(targetUrl)[1]
    const buildJson = await request({
      json: true,
      uri: this.buildUri(build),
      headers
    })

    // TODO: Account for multiple jobs
    const job = buildJson.jobs[0]
    const res = await request({
      json: true,
      uri: this.logUri(job.id),
      headers
    })

    const { command, content } = this.parseLog(res.content)

    return {
      number: buildJson.pull_request_number,
      data: {
        provider: 'Travis CI',
        content,
        targetUrl,
        command
      }
    }
  }
}

module.exports = Travis
