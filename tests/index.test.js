const {createRobot} = require('probot')
const nock = require('nock')
const path = require('path')
const fs = require('fs')
const ciReporter = require('../lib')

const issuesGet = require('./fixtures/issues.get.json')

const readFile = file => fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8')

describe('ci-reporter', () => {
  let robot, github

  beforeEach(() => {
    robot = createRobot()
    github = {
      issues: {
        get: jest.fn(() => Promise.resolve({data: {comments: []}})),
        createComment: jest.fn(),
        editComment: jest.fn()
      }
    }

    robot.auth = jest.fn(() => Promise.resolve(github))
    ciReporter(robot)
  })

  describe('Travis CI', () => {
    it('creates the correct comment', async () => {
      const log = readFile(path.join('travis', 'log.txt'))

      nock('https://api.travis-ci.org')
        .get('/build/123').reply(200, {
          pull_request_number: 1,
          jobs: [{ id: 1234, number: 1, state: 'failed' }]
        })
        .get('/job/1234/log').reply(200, { content: log })

      const event = {
        event: 'status',
        payload: {
          commit: 'b04b9ce383a933ed1a0a7b3de9e1cd31770b380e',
          target_url: 'https://travis-ci.org/JasonEtco/public-test/builds/123?utm_source=github_status&utm_medium=notification',
          context: 'continuous-integration/travis-ci/pr',
          state: 'failure',
          repository: {
            name: 'public-test',
            owner: { login: 'JasonEtco' }
          },
          installation: { id: 123 }
        }
      }

      await robot.receive(event)
      expect(github.issues.createComment).toHaveBeenCalledTimes(1)

      const args = github.issues.createComment.mock.calls[0]

      expect(args[0].body).toMatchSnapshot()
      expect(args[0].number).toBe(1)
      expect(args[0].owner).toBe('JasonEtco')
      expect(args[0].repo).toBe('public-test')
    })
  })

  describe('Circle CI', () => {
    let event, build, output, commit

    beforeEach(() => {
      event = {
        event: 'status',
        payload: {
          commit: 'b04b9ce383a933ed1a0a7b3de9e1cd31770b380e',
          target_url: 'https://circleci.com/gh/JasonEtco/todo/5?utm_campaign=vcs-integration-link&utm_medium=referral&utm_source=github-build-link',
          context: 'ci/circleci',
          state: 'failure',
          repository: {
            name: 'todo',
            owner: { login: 'JasonEtco' }
          },
          installation: { id: 123 }
        }
      }

      build = readFile(path.join('circle', 'build.json'))
      output = readFile(path.join('circle', 'output.json'))
      commit = readFile(path.join('circle', 'commit.json'))
    })

    it('creates the correct comment', async () => {
      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, build)
        .get('/fake-output-url').reply(200, output)

      await robot.receive(event)
      expect(github.issues.createComment).toHaveBeenCalledTimes(1)

      const args = github.issues.createComment.mock.calls[0]

      expect(args[0].body).toMatchSnapshot()
      expect(args[0].number).toBe(1)
      expect(args[0].owner).toBe('JasonEtco')
      expect(args[0].repo).toBe('todo')
    })

    it('does not create a comment if the status is not in a PR', async () => {
      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, commit)
        .get('/fake-output-url').reply(200, output)

      await robot.receive(event)
      expect(github.issues.createComment).not.toHaveBeenCalled()
    })

    it('updates an existing comment', async () => {
      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, build)
        .get('/fake-output-url').reply(200, output)

      github.issues.get.mockReturnValueOnce(Promise.resolve(issuesGet))
      await robot.receive(event)
      expect(github.issues.editComment).toHaveBeenCalled()
    })
  })

  it('does nothing if the status context is not accounted for', async () => {
    const event = {
      event: 'status',
      payload: {
        context: 'i/do/not/exist',
        state: 'failure',
        installation: { id: 123 }
      }
    }

    await robot.receive(event)
    expect(github.issues.createComment).not.toHaveBeenCalled()
  })

  it('does nothing on non-failed status', async () => {
    const event = {
      event: 'status',
      payload: {
        state: 'passed',
        installation: { id: 123 }
      }
    }

    await robot.receive(event)
    expect(github.issues.createComment).not.toHaveBeenCalled()
  })
})
