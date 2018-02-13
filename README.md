<p align="center">
  <img src="https://avatars2.githubusercontent.com/in/8035?s=88&v=4" height="64">
  <h3 align="center">ci-reporter</h3>
  <p align="center">A GitHub App built with [Probot](https://github.com/probot/probot) that pastes the error output of a failing commit into the relevant PR<p>
  <p align="center"><a href="https://travis-ci.org/JasonEtco/ci-reporter"><img src="https://img.shields.io/travis/JasonEtco/ci-reporter/master.svg" alt="Build Status"></a> <a href="https://codecov.io/gh/JasonEtco/ci-reporter/"><img src="https://img.shields.io/codecov/c/github/JasonEtco/ci-reporter.svg" alt="Codecov"></a></p>
</p>

Currently supports TravisCI and CircleCI. If you're interested in seeing support for another CI tool, please [open an issue!](https://github.com/JasonEtco/ci-reporter/issues/new)

## Usage

Simply [install the app](https://github.com/apps/ci-reporter) and watch the magic happen as your Pull Requests trigger failure statuses.

<p align="center">
  <img src="https://user-images.githubusercontent.com/10660468/36135129-22af032a-1057-11e8-925a-d952e1a31105.png" alt="ci-reporter commenting on a PR with failed build log" width="760">
</p>

## How it works

When a build fails, the CI provider will tell GitHub (via a status). GitHub then tells **ci-reporter** about a failed status, and it'll find the part of the build that failed, then comment back on the PR.

## Setup

```
# Install dependencies
npm install

# Run the bot
npm start
```