const Travis = require('../../functions/src/providers/Travis')
const nock = require('nock')
const fs = require('fs')
const path = require('path')

describe('Travis', () => {
  const log = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'travis', 'log.txt'), 'utf8')

  describe('static get ctx()', () => {
    it('returns the correct status context string', () => {
      expect(Travis.ctx).toBe('continuous-integration/travis-ci/pr')
    })
  })

  describe('buildUri', () => {
    it('creates the correct URI', () => {
      const travis = new Travis()
      expect(travis.buildUri(317090494)).toBe('https://api.travis-ci.org/build/317090494')
    })
  })

  describe('logUri', () => {
    it('creates the correct URI', () => {
      const travis = new Travis()
      expect(travis.logUri(123)).toBe('https://api.travis-ci.org/job/123/log')
    })
  })

  describe('parseLog', () => {
    let travis

    beforeEach(() => {
      travis = new Travis()
    })

    it('returns the correct string', () => {
      expect(travis.parseLog(log)).toMatchSnapshot()
    })
  })

  describe('serialize', () => {
    let travis, context

    beforeEach(() => {
      nock('https://api.travis-ci.org')
        .get('/build/123').reply(200, {
          pull_request_number: 1,
          jobs: [{ id: 1234, number: 1, state: 'failed' }]
        })
        .get('/job/1234/log').reply(200, { content: log })

      context = {
        payload: {
          target_url: 'https://travis-ci.org/JasonEtco/public-test/builds/123?utm_source=github_status&utm_medium=notification'
        }
      }

      travis = new Travis(context)
    })

    it('returns the correct body string', async () => {
      const res = await travis.serialize()
      expect(res.number).toBe(1)
      expect(res.data.content).toMatchSnapshot()
    })

    it('uses the API token in a header', async () => {
      nock.cleanAll()
      const scoped = nock('https://api.travis-ci.org')
        .get('/build/123').reply(200, {
          pull_request_number: 1,
          jobs: [{ id: 1234, number: 1, state: 'failed' }]
        }).matchHeader('Authorization', 'token 123')
        .get('/job/1234/log').reply(200, { content: log }).matchHeader('Authorization', 'token 123')

      const privateTravis = new Travis(context, 123)

      await privateTravis.serialize()
      expect(scoped.isDone()).toBeTruthy()
    })
  })
})
