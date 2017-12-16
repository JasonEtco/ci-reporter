const request = require('request-promise-native')

class Travis {
  constructor (context) {
    this.context = context
  }

  static get ctx () {
    return 'continuous-integration/travis-ci/pr'
  }

  buildUri (build) { return `https://api.travis-ci.org/builds/${build}` }
  logUri (job) { return `https://api.travis-ci.org/jobs/${job}/log` }

  async serialize () {
    const { target_url: targetUrl } = this.context.payload
    const map = new Map()
    const build = /\/builds\/(\d+)/g.exec(targetUrl)[1]
    const buildJson = JSON.parse(await request({
      uri: this.buildUri(build),
      headers: { Accept: 'application/vnd.travis-ci.2+json' }
    }))

    const failedJobs = buildJson.jobs.filter(job => job.state === 'failed')
    await Promise.all(failedJobs.map(async job => {
      const res = await request(this.logUri(job.id))
      const l = '$ npm test\r\n\r\n'
      let content = res.substring(res.indexOf(l) + l.length, res.indexOf('Test failed.  See above for more details.'))
      content = content.substring(0, content.lastIndexOf('\n'))
      map.set({ id: job.id, number: job.number }, content)
    }))

    let body = ''

    map.forEach((content, { id, number }) => {
      body += `Here's the failing log from [${number}](${targetUrl}/${number})\n\`\`\`\n${content}\n\`\`\`\n`
    })

    const number = buildJson.build.pull_request_number
    return { body, number }
  }
}

module.exports = Travis
