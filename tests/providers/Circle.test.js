const Circle = require('../../lib/providers/Circle')
const nock = require('nock')
const fs = require('fs')
const path = require('path')

describe('Circle', () => {
  describe('static get ctx()', () => {
    it('returns the correct status context string', () => {
      expect(Circle.ctx).toBe('continuous-integration/circle-ci/pr')
    })
  })

  describe('buildUri', () => {
    it('creates the correct URI', () => {
      const circle = new Circle()
      const repo = { owner: 'JasonEtco', repo: 'ci-reporter' }
      expect(circle.buildUri(repo, 317090494)).toBe('https://circleci.com/api/v1.1/project/github/JasonEtco/ci-reporter/317090494')
    })
  })

  describe('serialize', () => {
    let circle

    beforeEach(() => {
      const build = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'circle', 'build.json'), 'utf8')
      const output = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'circle', 'output.json'), 'utf8')

      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, build)
        .get('/fake-output-url').reply(200, output)

      circle = new Circle({
        payload: {
          target_url: 'https://circleci.com/gh/JasonEtco/todo/5?utm_source=github_status&utm_medium=notification'
        },
        repo: () => ({ owner: 'JasonEtco', repo: 'todo' })
      })
    })

    it('returns the correct body string', async () => {
      const res = await circle.serialize()
      expect(res.number).toBe(1)
      expect(res.body).toMatchSnapshot()
    })

    // it('returns the correct body string with multiple jobs', async () => {
    //   nock.cleanAll()
    //   nock('https://api.circle-ci.org')
    //     .get('/builds/123').reply(200, JSON.stringify({
    //       build: { pull_request_number: 1 },
    //       jobs: [{ id: 1234, number: 1, state: 'failed' }, { id: 12345, number: 1, state: 'failed' }]
    //     }))
    //     .get('/jobs/1234/log').reply(200, logFile)
    //     .get('/jobs/12345/log').reply(200, logFile)

    //   const res = await circle.serialize()
    //   expect(res.number).toBe(1)
    //   expect(res.body).toMatchSnapshot()
    // })
  })
})
