#!/usr/bin/env node

const path = require("path");
const async = require("async");
const fs = require("fs");
const yaml = require("js-yaml");

const DockerMocha = require("./src/DockerMocha");
const DockerManager = require("./src/DockerManager");
const Utils = require("./src/utils");
const Queue = require('better-queue');
const ExportToCsv = require('export-to-csv').ExportToCsv;
const Mocha = require('mocha');

const defaultFileName = "tests.json";
const defaultFile = path.join(process.cwd(), defaultFileName);
let overrideFile = null;
let composeFile = null;
let entrypoint = null;

const vanillaString = "";

const SLEEP = 100;
const MAX_TIMEOUT = 600000;
const MAX_RETRIES = 0;

const DEFAULT_THREAD = 4;
let threadsNumber = DEFAULT_THREAD;

let defaultExists = false;
let overrideExists = false;

let testFile = false;
let setupFile = false;

const dockerMocha = new DockerMocha();

let passedTests = 0;
let failedTests = 0;
let failedTestsArray = [];
let passedTestsArray = [];

let startTime;
let finishTime;

let queue;

const csvOptions = {
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: true,
    showTitle: false,
    // title: 'Docker-Mocha Details',
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
};

const csvExporter = new ExportToCsv(csvOptions);

let data = [];

const timeStamp = Utils.getTimeStamp();
const logFileName = "docker-mocha_" + timeStamp + ".log";

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
    if(process.argv[i] === "-c" || process.argv[i] === "--compose")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            composeFile = path.join(process.cwd(), process.argv[Number(i) + 1]);
        }
    }

    //Check if test entrypoint specified
    if(process.argv[i] === "-e" || process.argv[i] === "--entrypoint")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            entrypoint = process.argv[Number(i) + 1];
        }
    }

    //check if port
    if(process.argv[i] === "-p" || process.argv[i] === "--port")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            let port = parseInt(process.argv[Number(i) + 1]);
            if(!isNaN(port))
                dockerMocha.port = port;
        }
    }

    if(process.argv[i] === "--config")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            dockerMocha.deployment_config = process.argv[Number(i) + 1];
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

    if(process.argv[i] === "--no-docker")
    {
        dockerMocha.noDocker = true;
    }

    if(process.argv[i] === "--testFile")
    {
        testFile = process.argv[Number(i) + 1];
    }

    if(process.argv[i] === "--setupFile")
    {
        setupFile = process.argv[Number(i) + 1];
    }
}

if(!setupFile && !testFile) // manager
{
    // console.log("NEM NADA Setup and test file");
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

        //Initialize DockerManager
        DockerManager();

        startTime = new Date();

        if(dockerMocha.noDelete)
        {
            manager();
        }
        else if(dockerMocha.noDocker)
        {
            require('./src/NoDocker').noDocker(dockerMocha);
        }
        else
        {
            DockerManager.removeAllVolumes(() =>
            {
                DockerManager.deleteAllStates(dockerMocha, () =>
                {
                    manager();
                });
            });
        }
    }
}
else if(testFile && setupFile) // run a test. Needs the init function of the setup file and the testFile to run the test itself
{
    // console.log("Setup and test file");

    const loaderClass = Utils.requireFile(setupFile);
    const testFilePath = Utils.getAbsPath(testFile);

    console.log(`Running Tests on ${testFile} after running init present in ${setupFile}`);


    let testsFailed = 1;

    const taskList = [
        loaderClass.init,
        function(callback)
        {
            console.log("Ran INIT of " + loaderClass.name + " before test " + testFile);
            callback(null);
        },
        function(callback)
        {
            if(dockerMocha.port)
            {
                console.log("Waiting for server on port " + dockerMocha.port + " to be available, as specified by the -p argument of docker-mocha.");
                Utils.checkConnectivityOnPort(dockerMocha.port, callback);
            }
            else
            {
                callback(null);
            }
        },
        function(callback)
        {
            // Instantiate a Mocha instance.
            const mocha = new Mocha();

            mocha.addFile(
                testFilePath
            );

            // Run the tests.
            mocha.run(function(failures) {
                process.exitCode = failures ? 1 : 0;  // exit with non-zero status if there were failures
                testsFailed = process.exitCode;
                callback();
            });
        },
        function(callback)
        {
            console.log("DOCKER-MOCHA: Started shutdown of " + loaderClass.name);
            loaderClass.shutdown(function()
            {
                console.log("DOCKER-MOCHA: Finished shutdown of " + loaderClass.name + " with error: " + testsFailed);
                callback(null);
            });
        },
        function()
        {
            console.log("Exiting after running shutdown of " + loaderClass.name);
            process.exit(testsFailed);
        }
    ];

    Utils.runSync(taskList);
    console.log("After Run Sync, test + setup");

}
else if(setupFile) // run a setup. Needs the init, load and shutdown methods of the setupFile
{
    // console.log("Setup file only");
    const loaderClass = Utils.requireFile(setupFile);
    console.log(`Setting up state ${loaderClass.name} from file ${setupFile}`);

    const taskList = [
        loaderClass.init,
        function(callback)
        {
            if(dockerMocha.port)
            {
                console.log("Waiting for server on port " + dockerMocha.port + " to be available, as specified by the -p argument of docker-mocha.");
                Utils.checkConnectivityOnPort(dockerMocha.port, callback);
            }
            else
            {
                console.log("Skipping wait for service bootup as no -p argument was specified.");
                callback(null);
            }
        },
        function(callback)
        {
            console.log("Ran INIT of " + loaderClass.name);
            callback(null);
        },
        loaderClass.load,
        function(callback)
        {
            console.log("Ran LOAD of " + loaderClass.name);
            callback(null);
        },
        loaderClass.shutdown,
        function(callback)
        {
            console.log("Exiting after running shutdown of " + loaderClass.name);
            process.exit(0);
        }
    ];

    Utils.runSync(taskList);
    console.log("After Run Sync, setup");
}

function manager()
{
    if(Utils.isNull(dockerMocha.rootState))
    {
        console.error("ERROR: No root state specified, please provide exactly one state with no parent dependency");
        process.exit(1);
        return;
    }

    queue = new Queue(function (task, callback)
    {
        if(task["type"] === "state")
        {
            //In case no Checkpoint flag, immediately unlock
            if (dockerMocha.noCheckpoint)
            {
                if(Utils.isNull(dockerMocha.dependencyMap[task["name"]])) //in case it does no have dependencies
                {
                    callback(null);
                }
                else
                {
                    const childTests = dockerMocha.dependencyMap[task["name"]]["child_tests"];
                    const childStates = dockerMocha.dependencyMap[task["name"]]["child_states"];

                    //unlock all the child states
                    for (const i in childStates)
                    {
                        const state = childStates[i];
                        queue.push({"type": "state", "name": state});
                    }

                    //unlock all the child tests
                    for (const j in childTests)
                    {
                        const test = childTests[j];
                        queue.push({"type": "test", "name": test});
                    }

                    callback(null);
                }
            }
            else
            {
                createState(task["name"], (err) =>
                {
                    if (err > 0)
                    {
                        callback(1);
                    }
                    else
                    {

                        if(Utils.isNull(dockerMocha.dependencyMap[task["name"]]))
                        {
                            callback(null);
                        }
                        else
                        {
                            const childTests = dockerMocha.dependencyMap[task["name"]]["child_tests"];
                            const childStates = dockerMocha.dependencyMap[task["name"]]["child_states"];

                            //unlock all the child tests
                            for (const j in childTests)
                            {
                                const test = childTests[j];
                                queue.push({"type": "test", "name": test});
                            }

                            //unlock all the child states
                            for (const i in childStates)
                            {
                                const state = childStates[i];
                                queue.push({"type": "state", "name": state});
                            }

                            callback(null);
                        }
                    }
                })
            }
        }
        else if(task["type"] === "test")
        {
            runTest(task["name"], (err) =>
            {
                if(err)
                {
                    failedTests++;
                    callback(1);
                }
                else
                {
                    passedTests++;
                    callback(null);
                }
            })
        }
    },
        {concurrent: threadsNumber, maxRetries: MAX_RETRIES, maxTimeout: MAX_TIMEOUT});

    queue.push({"type":"state","name":dockerMocha.rootState});

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

        const csvData = csvExporter.generateCsv(data, true);
        fs.writeFileSync('data_' + timeStamp + '.csv', csvData);

        fs.appendFileSync(logFileName, "Execution started with Timestamp: " + timeStamp + "\n");
        fs.appendFileSync(logFileName, "Execution finished in " + hours + " hour(s), " + minutes + " minute(s) and " + seconds + " seconds" + "\n");
        fs.appendFileSync(logFileName, "Docker Mocha finished with " + passedTests + "/" + (passedTests+failedTests) + " passed tests" + "\n");
        fs.appendFileSync(logFileName, "Docker Mocha executed " + (passedTests+failedTests) + "/" + Object.keys(dockerMocha.testsMap).length + "\n");

        fs.appendFileSync(logFileName, "\nPASSED TESTS:\n");
        for(let j in passedTestsArray)
        {
            try
            {
                fs.appendFileSync(logFileName, passedTestsArray[j] + "\n");
            } catch (err) {}
        }


        fs.appendFileSync(logFileName, "\n\nFAILED TESTS:\n");
        for(let i in failedTestsArray)
        {
            try
            {
                fs.appendFileSync(logFileName, failedTestsArray[i] + "\n");
            } catch (err) {}
        }

        process.exit(0);
    })
}

function createState(state, callback)
{
    console.log("Creating State: " + state);

    let stateParent = dockerMocha.getStateParent(state);

    const startDateState = new Date();

    DockerManager.checkIfStateExists(state, dockerMocha, (exists) =>
    {
        if(exists)
        {
            data.push({
                timestamp: Utils.convertTimestamp(startDateState),
                state: state,
                event: "state_reused",
                test: '',
                time_taken: 0
            });

            callback(0);
        }
        else
        {
            data.push({
                timestamp: Utils.convertTimestamp(startDateState),
                state: state,
                event: "state_create_start",
                test: '',
                time_taken: 0
            });

            DockerManager.StopAndRemoveContainers(state, dockerMocha, () =>
            {
                DockerManager.RemoveNetworks(state, dockerMocha, () =>
                {
                    DockerManager.restoreState(state, state, dockerMocha, (info) =>
                    {
                        DockerManager.logEntrypoint(info.entrypoint, dockerMocha, () =>
                        {
                            DockerManager.stopEnvironment(state, stateParent, dockerMocha, (err) =>
                            {
                                const stopDateState = new Date();

                                data.push({
                                    timestamp: Utils.convertTimestamp(stopDateState),
                                    state: state,
                                    event: "state_create_complete",
                                    test: '',
                                    time_taken: Math.abs(stopDateState - startDateState) / 1000,
                                });

                                callback(err);
                            });
                        });
                    });
                })
            })
        }
    })
}

function runTest(test, callback)
{
    console.log("Running Test: " + test);

    const state = dockerMocha.getTestState(test);
    const testPath = dockerMocha.getTestPath(test);
    let exitState;

    if(dockerMocha.noCheckpoint)
        exitState = null;
    else
        exitState = state;

    const startDateTest = new Date();

    DockerManager.StopAndRemoveContainers(state, dockerMocha, () =>
    {
        DockerManager.RemoveNetworks(test, dockerMocha, () =>
        {
            DockerManager.restoreState(state, test, dockerMocha, (info) =>
            {
                DockerManager.runTest(info.entrypoint, test, testPath, dockerMocha, (err, result) =>
                {
                    if (err)
                    {
                        console.error("Test Failed: " + test);
                        failedTestsArray.push(testPath);
                    }
                    else
                    {
                        passedTestsArray.push(testPath);
                        console.info("Test Passed: " + test);
                    }

                    DockerManager.logEntrypoint(info.entrypoint, dockerMocha, () =>
                    {
                        DockerManager.stopEnvironment(test, exitState, dockerMocha, () =>
                        {
                            const stopDateTest = new Date();

                            data.push({
                                timestamp: Utils.convertTimestamp(stopDateTest),
                                state: state,
                                event: "test_concluded",
                                test: test,
                                time_taken: Math.abs(stopDateTest - startDateTest) / 1000,
                            });

                            callback(err);
                        });
                    });
                })
            })
        })
    })
}
