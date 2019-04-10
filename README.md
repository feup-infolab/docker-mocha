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
- Netcat 
- Linux or MacOS (see ... why windows is not supported)

## Support
This module only supports **mocha** tests. No windows support is available either given the design architecture of docker in windows (see ...).

## Setup
To setup docker-mocha the users need to first verify that the requirments are met. Then install it via npm ```npm install docker-mocha```. Additional setup steps are required as it follows

### Tests file
The users must create a ```tests.json``` file where they list all the tests by file. Each test must have the following parameters:

Parameter | Description
--------- | -----------
name | Name of the test and state, must be unique and cannot contain spaces
parent | Identifier of the parent state it deppends on. If root, leave it ```null```
test | the relative path of the test file, from the project root. It **cannot** be null
setup | the relative path of the setup file, from the project root. It can be null
init | the relative path of the init file, from the project root. It can be null

####  Example 

```json
[
  {"name": "init",       "parent": null,       "test": "test/init.js",              "setup": null,                        "init": null},
  {"name": "testDollar", "parent": "setDollar","test": "test/dollar/testDollar.js", "setup": "setup/dollar/setDollar.js", "init": null},
  {"name": "setDollar",  "parent": "init",     "test": "test/dollar/setDollar.js",  "setup": "setup/init.js",             "init": null},
  {"name": "setPound",   "parent": "init",     "test": "test/pound/setPound.js",    "setup": "setup/init.js",             "init": null},
  {"name": "testPound",  "parent": "setPound", "test": "test/pound/testPound.js",   "setup": "setup/pound/setPound.js",   "init": null}
]
```

### Compose file
This module makes heavy use of docker in order to work. Also, in order to isolate the test environment it requires a valid ```docker-compose.yml```. 

#### Example

```yaml
version: '3.5'

services:
  dendro:
    container_name: ${TEST_NAME}.dendro
    image: nuno/node-currency:latest${PARENT_STATE}
    build:
      context: .
      dockerfile: dockerfiles/Dockerfile
    networks:
      custom_net:
        aliases:
          - dendro
  mongo:
    container_name: ${TEST_NAME}.mongo
    image: mongo:3${PARENT_STATE}
    networks:
      custom_net:
        aliases:
          - mongo

networks:
  custom_net:
    name: ${TEST_NAME}
    driver: bridge
```    

## Options


## Testing

### Running tests locally
- Run ```npm test```

### Running tests inside docker compose
- Run ```npm run test-docker```

### Running tests with docker-mocha

## Current test approach and dependency tree

![Repository dependency tree](https://github.com/feup-infolab/setup-caching/blob/master/images/setup-cachingTests.png)
