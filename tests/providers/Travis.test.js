const Travis = require('../../lib/providers/Travis')
const fs = require('fs')
const path = require('path')

describe('Travis', () => {
  describe('static get ctx()', () => {
    it('returns the correct status context string', () => {
      expect(Travis.ctx).toBe('continuous-integration/travis-ci/pr')
    })
  })

  describe('buildUri', () => {
    it('creates the correct URI', () => {
      const travis = new Travis()
      expect(travis.buildUri(317090494)).toBe('https://api.travis-ci.org/builds/317090494')
    })
  })

  describe('logUri', () => {
    it('creates the correct URI', () => {
      const travis = new Travis()
      expect(travis.logUri(123)).toBe('https://api.travis-ci.org/jobs/123/log')
    })
  })

  describe('parseLog', () => {
    let log, travis

    beforeEach(() => {
      travis = new Travis()
      log = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'log.txt'), 'utf8')
    })

    it('returns the correct string', () => {
      expect(travis.parseLog(log)).toMatchSnapshot()
    })
  })
})
