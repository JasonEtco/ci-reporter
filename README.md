# ci-reporter &middot; [![Build Status](https://img.shields.io/travis/JasonEtco/ci-reporter/master.svg)](https://travis-ci.org/JasonEtco/ci-reporter) [![Codecov](https://img.shields.io/codecov/c/github/JasonEtco/ci-reporter.svg)](https://codecov.io/gh/JasonEtco/ci-reporter/)

> a GitHub App built with [probot](https://github.com/probot/probot) that pastes the error output of a failing commit into the relevant PR.

Currently supports TravisCI and CircleCI with "simple" setups running off of a single `npm test` script.

## Setup

```
# Install dependencies
npm install

# Run the bot
npm start
```

See [docs/deploy.md](docs/deploy.md) if you would like to run your own instance of this app.
