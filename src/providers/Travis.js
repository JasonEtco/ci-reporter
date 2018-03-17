const request = require('request-promise-native')
const stripAnsi = require('strip-ansi')
const delay = require('delay')

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
    const reg = /\[0K\$\snpm\stest(?:\r\n|\n)*([\s\S]+)[\r\n]+.*Test failed\./g

    const result = reg.exec(log)

    if (!result) {
      return false
    }

    let content = result[1].trim()
    return { content, command: 'npm test' }
  }

  async getLog (job) {
    const res = await request({
      uri: this.logUri(job.id),
      headers: this.headers
    })

    const result = this.parseLog(res)

    // Travis sometimes sends back incomplete logs
    // if the request is made too quickly.
    if (!result && this.retries <= 3) {
      this.context.log('Log incomplete; Retrying...')
      this.retries = this.retries + 1

      await delay(500)
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
