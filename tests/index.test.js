const {createRobot} = require('probot')
const nock = require('nock')
const path = require('path')
const fs = require('fs')
const ciReporter = require('../functions/src')

const readFile = file => fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8')
const commentsGet = require('./fixtures/issues.getComments.json')
const commentsGetTwo = require('./fixtures/issues.getComments-two.json')

describe('ci-reporter', () => {
  let robot, github

  beforeEach(() => {
    robot = createRobot()
    github = {
      issues: {
        getComments: jest.fn(() => Promise.resolve({data: []})),
        createComment: jest.fn(),
        editComment: jest.fn()
      },
      repos: {
        getContent: jest.fn(() => Promise.resolve({data: { content: '' }}))
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
          sha: 'b04b9ce383a933ed1a0a7b3de9e1cd31770b380e',
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
          sha: 'b04b9ce383a933ed1a0a7b3de9e1cd31770b380e',
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

      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, build)
        .get('/fake-output-url').reply(200, output)
    })

    it('creates the correct comment', async () => {
      await robot.receive(event)
      expect(github.issues.createComment).toHaveBeenCalledTimes(1)

      const args = github.issues.createComment.mock.calls[0]

      expect(args[0].body).toMatchSnapshot()
      expect(args[0].number).toBe(1)
      expect(args[0].owner).toBe('JasonEtco')
      expect(args[0].repo).toBe('todo')
    })

    it('creates the correct comment with before/after disabled', async () => {
      github.repos.getContent.mockReturnValueOnce(Promise.resolve({ data: {content: Buffer.from('after: false\nbefore: false')} }))
      await robot.receive(event)
      expect(github.issues.createComment.mock.calls[0][0].body).toMatchSnapshot()
    })

    it('creates the correct comment with custom before/after', async () => {
      github.repos.getContent.mockReturnValueOnce(Promise.resolve({ data: {content: Buffer.from('before: I come before!\nafter: And I come after!')} }))
      await robot.receive(event)
      expect(github.issues.createComment.mock.calls[0][0].body).toMatchSnapshot()
    })

    it('does not create a comment if the status is not in a PR', async () => {
      nock.cleanAll()
      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, commit)
        .get('/fake-output-url').reply(200, output)

      await robot.receive(event)
      expect(github.issues.createComment).not.toHaveBeenCalled()
    })

    it('updates an existing comment', async () => {
      github.issues.getComments.mockReturnValueOnce(Promise.resolve(commentsGet))
      await robot.receive(event)
      expect(github.issues.editComment.mock.calls[0][0]).toMatchSnapshot()
    })

    it('updates an existing comment twice', async () => {
      nock.cleanAll()
      nock('https://circleci.com')
        .get('/api/v1.1/project/github/JasonEtco/todo/5').times(2).reply(200, build)
        .get('/fake-output-url').times(2).reply(200, output)

      github.issues.getComments.mockReturnValueOnce(Promise.resolve(commentsGet))
      await robot.receive(event)
      github.issues.getComments.mockReturnValueOnce(Promise.resolve(commentsGetTwo))
      await robot.receive(event)
      expect(github.issues.editComment.mock.calls[1][0]).toMatchSnapshot()
    })

    it('respect the updateComment config', async () => {
      github.repos.getContent.mockReturnValueOnce(Promise.resolve({data: {content: Buffer.from('updateComment: false')}}))
      github.issues.getComments.mockReturnValueOnce(Promise.resolve(commentsGet))
      await robot.receive(event)
      expect(github.issues.createComment).toHaveBeenCalled()
      expect(github.issues.editComment).not.toHaveBeenCalled()
    })
  })

  it('does nothing if the status context is not accounted for', async () => {
    const event = {
      event: 'status',
      payload: {
        context: 'i/do/not/exist',
        state: 'failure',
        installation: { id: 123 },
        repository: {
          name: 'public-test',
          owner: { login: 'JasonEtco' }
        }
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
        installation: { id: 123 },
        repository: {
          name: 'public-test',
          owner: { login: 'JasonEtco' }
        }
      }
    }

    await robot.receive(event)
    expect(github.issues.createComment).not.toHaveBeenCalled()
  })
})
