# Docker-Mocha
Service/end-to-end tests execution in local and isolated environment.
With Setup Caching (Dissertation Nuno Neto)

## Introduction
Docker-Mocha is a npm package developed in order to optimize a very characteristic set of test environments.
Environments with a considerable ammount of service/end-to-end tests and with setup dependencies. In a normal execution these test suites would run in the host machine, in a single thread and with multiple recreations of previous test setup states. The resulting unoptimized pipeline might provide undisired execution times.

Docker-Mocha solves this problem by creating a test dependency tree, each test is executed in a isolated docker environment with its own network. By having isolation, it is possible to run the whole suite in a paralel environment. Additionaly, every setup state is saved (cached) in order for the sucessor test to load and execute more quickly. 

These set of requirments allow to improve the overall execution time of the test suite.

## Requirments
- Docker CE
- Node.js
- Linux or MacOS (see ... why windows is not supported)

## Setup

## Options


## Testing

### Running tests locally
- Run ```npm test```

### Running tests inside docker compose
- Run ```npm run test-docker```

### Running tests with docker-mocha

## Current test approach and dependency tree

![Repository dependency tree](https://github.com/feup-infolab/setup-caching/blob/master/images/setup-cachingTests.png)
