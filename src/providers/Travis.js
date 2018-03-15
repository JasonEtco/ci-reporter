const request = require('request-promise-native')
const stripAnsi = require('strip-ansi')
const wait = ms => new Promise((resolve, reject) => setTimeout(resolve, ms))

class Travis {
  constructor (context) {
    this.context = context
    this.retries = 0
    this.headers = { 'Travis-API-Version': 3 }
  }

  static get ctx () {
    return 'continuous-integration/travis-ci/pr'
  }

  buildUri (build) { return `https://api.travis-ci.org/build/${build}` }
  logUri (job) { return `https://api.travis-ci.org/job/${job}/log.txt` }

  parseLog (log) {
    // sp00ky RegExp to start the extraction
    const reg = /(\[0K\$\s)(?![\s\S]+\1)(.+)(?:\r\n|\n)*([\s\S]+)[\r\n]+.*Test failed\./g
    const result = reg.exec(log)

    if (!result) {
      return false
    }

    const command = result[2]
    let content = result[3].trim()
    return { command, content }
  }

  async getLog (job) {
    const res = await request({
      uri: this.logUri(job.id),
      headers: this.headers
    })

    const result = this.parseLog(res)

    if (!result && this.retries <= 3) {
      this.context.log('Log incomplete; Retrying...')
      this.retries = this.retries + 1

      await wait(500)
      return this.getLog(job)
    }

    return result
  }

  async serialize () {
    const { target_url: targetUrl } = this.context.payload
    const build = /\/builds\/(\d+)/g.exec(targetUrl)[1]
    const buildJson = await request({
      json: true,
      uri: this.buildUri(build),
      headers: this.headers
    })

    // TODO: Account for multiple jobs
    const result = await this.getLog(buildJson.jobs[0])

    if (result) {
      const { content, command } = result
      return {
        number: buildJson.pull_request_number,
        data: {
          provider: 'Travis CI',
          content: stripAnsi(content),
          targetUrl,
          command
        }
      }
    }
  }
}

module.exports = Travis
