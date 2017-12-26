const {createRobot} = require('probot')
const nock = require('nock')
const path = require('path')
const fs = require('fs')
const ciReporter = require('../lib')

const readFile = file => fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8')

describe('ci-reporter', () => {
  let robot, github

  beforeEach(() => {
    robot = createRobot()
    github = {
      issues: {
        createComment: jest.fn()
      }
    }

    robot.auth = jest.fn(() => Promise.resolve(github))
    ciReporter(robot)
  })

  // it('works with Travis CI', async () => {
  // })

  it('works with Circle CI', async () => {
    const build = readFile(path.join('circle', 'build.json'))
    const output = readFile(path.join('circle', 'output.json'))

    nock('https://circleci.com')
      .get('/api/v1.1/project/github/JasonEtco/todo/5').reply(200, build)
      .get('/fake-output-url').reply(200, output)

    const event = {
      event: 'status',
      payload: {
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

    await robot.receive(event)
    const args = github.issues.createComment.mock.calls[0]

    expect(args[0].body).toMatchSnapshot()
    expect(args[0].number).toBe(1)
    expect(args[0].owner).toBe('JasonEtco')
    expect(args[0].repo).toBe('todo')

    expect(github.issues.createComment).toHaveBeenCalledTimes(1)
  })
})
