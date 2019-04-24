#!/usr/bin/env node

const DockerMocha = require("./src/DockerMocha");
const DockerManager = require("./src/DockerManager");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const Utils = require("./src/utils");
const Queue = require('better-queue');

const defaultFileName = "tests.json";
const defaultFile = path.join(process.cwd(), defaultFileName);
let overrideFile = null;
let composeFile = null;
let entrypoint = null;

const SLEEP = 100;
const MAX_TIMEOUT = 600000;
const MAX_RETRIES = 5;

const DEFAULT_THREAD = 4;
let threadsNumber = DEFAULT_THREAD;

let defaultExists = false;
let overrideExists = false;

const dockerMocha = new DockerMocha();
let running = 0;

let passedTests = 0;
let failedTests = 0;

let startTime;
let finishTime;

let queue;

for(let i in process.argv)
{
    //Check if file flag exists
    if(process.argv[i] === "-f" || process.argv[i] === "--file")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            overrideFile = path.join(process.cwd(), process.argv[Number(i) + 1]);
        }
    }

    //Check if threads flag exists
    if(process.argv[i] === "-t" || process.argv[i] === "--threads")
    {
        if((Number(i) + 1) < process.argv.length && Number.isInteger(Number(process.argv[Number(i) + 1])))
        {
            threadsNumber = Number(process.argv[Number(i) + 1])
        }
    }

    //Check if alternate docker compose exists
    if(process.argv[i] === "-c" || process[i] === "--compose")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            composeFile = path.join(process.cwd(), process.argv[Number(i) + 1]);
        }
    }

    //Check if test entrypoint specified
    if(process.argv[i] === "-e" || process[i] === "--entrypoint")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            entrypoint = process.argv[Number(i) + 1];
        }
    }

    //check if port
    if(process.argv[i] === "-p" || process[i] === "--port")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            let port = parseInt(process.argv[Number(i) + 1]);
            if(!isNaN(port))
                dockerMocha.port = port;
        }
    }

    if(process.argv[i] === "--no-checkpoint")
    {
        dockerMocha.noCheckpoint = true;
    }

    if(process.argv[i] === "--no-delete")
    {
        dockerMocha.noDelete = true;
    }
}

try
{
    //verify if the other *.json tests file exists
    if(overrideFile != null && fs.existsSync(overrideFile))
        overrideExists = true;
}
catch(err) {
    overrideExists = false;}

try
{
    //verify if the default *.json tests file exists
    if(defaultFile != null && fs.existsSync(defaultFile))
        defaultExists = true;
}
catch(err)
{
    defaultExists = false;}

try
{
    //verify if compose file exists
    if(composeFile != null)
        fs.existsSync(composeFile)
}
catch (err)
{
    console.warn("WARN: Specified Compose file not found, using default");
    composeFile = null;
}

if(!defaultExists && !overrideExists)
{
    console.error("ERROR: No Default file or Override file found");
    process.exit(1);
}
else
{
    let fileToUse = null;

    if(!overrideExists)
    {
        fileToUse = defaultFile;
        console.warn("WARN: Override file not found using default File");
    }
    else
    {
        fileToUse = overrideFile;
        console.info("INFO: Using override file: " + overrideFile);
    }

    //Loading compose File
    if(Utils.isNull(composeFile))
    {
        try
        {
            let composeContents = yaml.safeLoad(fs.readFileSync("docker-compose.yml"));
            composeFile = path.join(process.cwd(), "docker-compose.yml");
            dockerMocha.addComposeFile(composeFile, composeContents);
            console.info("INFO: Using default docker-compose.yml");
        }
        catch (e)
        {
            console.error("ERROR: No default docker-compose.yml");
            process.exit(1);
        }
    }
    else
    {
        try
        {
            let composeContents = yaml.safeLoad(fs.readFileSync(composeFile));
            dockerMocha.addComposeFile(composeFile, composeContents);
            console.info("INFO: Using specified compose file: " + composeFile);
        }
        catch (e)
        {
            console.error("ERROR: Could not load file: " + composeFile);
            process.exit(1);
        }
    }

    if(Utils.isNull(entrypoint))
    {
        try
        {
            const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), 'utf8'));
            entrypoint = packageJson.name;
            dockerMocha.entrypoint = entrypoint;
        }
        catch (e) {
            console.error("ERROR: Unable to retrieve entrypoint service, please provide a package json or specify with -e flag");
            process.exit(1);
        }
    }
    else
        dockerMocha.entrypoint = entrypoint;

    //Informing threads number
    console.info("INFO: Using " + threadsNumber + " thread(s)");

    //Parsing tests from *.json tests file
    const testsFile = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));


    const tests = testsFile["tests"];
    const states = testsFile["states"];

    if(Utils.isNull(tests))
    {
        console.error("ERROR: no section 'tests' specified in the test file");
        process.exit(1);
    }
    else if(Utils.isNull(states))
    {
        console.error("ERROR: no section 'states' specified in the test file");
        process.exit(1);
    }

    //Parsing states
    dockerMocha.statesMap = states;
    let rootTests = 0;
    for(let state in states)
    {
       if (states.hasOwnProperty(state))
       {
            if(Utils.isNull(states[state]["depends_on"]))
            {
                dockerMocha.rootState = state;
                rootTests++;
            }
            dockerMocha.addState(state);
       }
    }
    if(rootTests !== 1)
    {
        console.error("ERROR: Multiple root states detected, only one is allowed: " + rootTests);
        process.exit(1);
    }
    dockerMocha.verifyAndWarnStates();


    //Parsing tests
    //For each test verify if the test file and setup file exist. Add to docker mocha if positive
    let totalTests = 0;
    let badTests = 0;
    for(let test in tests)
    {
        if(tests.hasOwnProperty(test))
        {
            if(!Utils.isNull(tests[test]["state"]) && dockerMocha.statesMap.hasOwnProperty(tests[test]["state"]))
            {
                dockerMocha.addTest(test, tests[test]);
            }
            else
            {
                console.warn("WARN: Ignored: " + JSON.stringify(tests[test]));
                badTests++;
            }
        }
        totalTests++;
    }
    if(badTests > 0)
    {
        console.warn("WARN: Some tests have been ignored: " + badTests);
        console.log("INFO: Added " + (totalTests-badTests) + " tests");
    }
    else
    {
        console.log("INFO: All tests added: " + (totalTests));
    }


    return;

    //Initialize DockerManager
    DockerManager();

    startTime = new Date();


    //Stop, remove containers and Remove all images. start manager
    DockerManager.stopAllContainers(() =>
    {
        DockerManager.removeAllContainers(() =>
        {
            DockerManager.removeAllVolumes(() =>
            {
                if(dockerMocha.noDelete)
                {
                    manager();
                }
                else
                {
                    DockerManager.deleteAllStates(dockerMocha, () => {
                        manager();
                    });
                }
            });
        })
    });


    /*
    if(dockerMocha.noDelete)
    {
        manager();
    }
    else
    {
        DockerManager.deleteAllStates(dockerMocha, () => {
            manager();
        });
    }
    */
}

function manager()
{
    if(Utils.isNull(dockerMocha.rootTest))
    {
        console.error("ERROR: No root test specified, please provide exactly one test with no parent dependency");
        process.exit(1);
        return;
    }

    queue = new Queue(function (test, callback)
    {
        runTest(test, (err) =>
        {
            if(err > 0)
            {
                failedTests++;
                callback(1);
            }
            else
            {
                passedTests++;

                //given the test passed, remove from reference queue to prevent duplicate execution
                dockerMocha.referenceMap[test.name] = null;

                //add children if they were not executed before
                const children = dockerMocha.childrenMap[test.name];
                for(const i in children)
                {
                    const child = children[i];

                    if(!(Utils.isNull(dockerMocha.referenceMap[child.name])))
                    {
                        queue.push(child);
                    }
                }

                callback(null);
            }
        })
    },
        {concurrent: threadsNumber, maxRetries: MAX_RETRIES, maxTimeout: MAX_TIMEOUT});

    queue.push(dockerMocha.rootTest);

    queue.on('drain', function ()
    {
        finishTime = new Date();

        const res = Math.abs(finishTime - startTime) / 1000;
        const hours = Math.floor(res / 3600) % 24;
        const minutes = Math.floor(res / 60) % 60;
        const seconds = res % 60;

        console.log("Docker Mocha finished with " + passedTests + "/" + (passedTests+failedTests) + " passed tests");
        console.log("Docker Mocha executed " + (passedTests+failedTests) + "/" + Object.keys(dockerMocha.testsMap).length);
        //console.log("Docker Mocha skipped " + ((Object.keys(dockerMocha.testsMap).length) - (passedTests+failedTests)) + " tests");
        console.log("Execution finished in " + hours + " hour(s), " + minutes + " minute(s) and " + seconds + " seconds");

        process.exit(0);
    })
}



function runTest(test, callback)
{
    DockerManager.restoreState(test, dockerMocha, (info) =>
    {
        DockerManager.runInits(info.entrypoint, test, dockerMocha, () =>
        {
            DockerManager.runTest(info.entrypoint, test, (err, result) =>
            {
                if(err > 0)
                    console.error("Test Failed: " + test.name);
                else
                    console.info("Test Passed: " + test.name);

                console.log(err);
                console.log(result);

                DockerManager.stopState(test, info.parent, dockerMocha, () =>
                {
                    callback(err);
                });
            })
        })
    })
}