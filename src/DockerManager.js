const childProcess = require("child_process");
const async = require("async");
const vanillaString = "";
const Utils = require('./utils');
const os = require("os");
const request = require("request");
const _ = require("underscore");

const dockerMochaCommand = "node ./docker-mocha-run.js";

const DockerManager = function () {};

function validIP(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
        return (true)
    }
    return (false)
}

const logEverythingFromChildProcess = function (childProcess)
{
    childProcess.stdout.on("data", function (data)
    {
        console.log(data);
    });

    childProcess.stderr.on("data", function (data)
    {
        console.log(data);
    });

    childProcess.on("exit", function (code)
    {
        if (!code)
        {
            console.log("Process " + childProcess.cmd + " exited successfully (code 0). ");
        }
        else
        {
            console.log("Process " + childProcess.cmd + " exited with non-zero exit code (code " + code + ".");
        }
    });
};

/**
 * Gets information about services for the corresponding orchestra
 * @param dockerMocha
 * @param callback
 */
DockerManager.getAllServicesInOrchestra = function(dockerMocha, callback)
{
    const services = Object.keys(dockerMocha.composeContents.services);
    let servicesInfo = [];

    for(const i in services)
    {
        let service = services[i];
        let container = dockerMocha.composeContents.services[service];

        servicesInfo.push({
            service: service,
            name: container.container_name.replace(/\${.*}\./g, ""),
            image: container.image.replace(/:.*/g, ""),
            tag: container.image.replace(/.*\:/g, "").replace(/\${.*}/g, "")
        });
    }



    callback(servicesInfo);
};

DockerManager.deleteAllStates = function(dockerMocha, callback)
{
    DockerManager.getAllServicesInOrchestra(dockerMocha,(services) =>
    {
        console.log("Deleting all states");
        async.mapSeries(services,
            (service, callback) =>
            {
                //console.log(`'docker images | grep ${service.image} | tr -s ' ' | cut -d ' ' -f 2 | grep -v ${service.tag}$ | xargs -I {} docker rmi ${service.image}:{} -f'`);

                const newProcess = childProcess.exec(`docker images | grep ${service.image}| tr -s ' ' | cut -d ' ' -f 2 | grep -v ${service.tag}$ | xargs -I {} docker rmi ${service.image}:{} -f`,
                    (err, result) =>
                    {
                        callback();
                    });

                // logEverythingFromChildProcess(newProcess);
            },
            (err, results)=>
            {
                callback();
            });
    })
};


DockerManager.StopAndRemoveContainers = function(environment, dockerMocha, callback)
{
    console.log("Stopping and Removing all containers");

    const newProcess = childProcess.exec(`docker rm $(docker stop $(docker ps -a -q --filter name="${environment}.*"))`,
        (err, result) =>
        {
            callback();
        });

    // logEverythingFromChildProcess(newProcess);
};

DockerManager.RemoveNetworks = function(environment, dockerMocha, callback)
{
    console.log("Removing Networks");

    const newProcess = childProcess.exec(`docker network rm $(docker network ls -q --filter name="${environment}")`,
        (err, result) =>
        {
            callback();
        });

    // logEverythingFromChildProcess(newProcess);
};

DockerManager.stopAllContainers = function(callback)
{
    console.log("Stopping all containers", "'docker stop $(docker ps -a -q)'");

    const newProcess = childProcess.exec('docker stop $(docker ps -a -q)',
        (err, result) =>
        {
            callback();
        });

    // logEverythingFromChildProcess(newProcess);
};

DockerManager.removeAllContainers = function(callback)
{
    console.log("Removing all containers", "'docker rm $(docker ps -a -q)'");

    const newProcess = childProcess.exec('docker rm $(docker ps -a -q)',
        (err, result) =>
        {
            callback();
        });

    // logEverythingFromChildProcess(newProcess);
};



DockerManager.removeAllVolumes = function(callback)
{
    console.log("Removing all volumes", "'docker volume prune -f'");

    const newProcess = childProcess.exec('docker volume prune -f',
        (err, result) =>
        {
            callback();
        });
    // logEverythingFromChildProcess(newProcess);
};

/**
 * Restores a state, returning the info of the restored state. It is responsible for creating states if they do not exist
 * @param state
 * @param project
 * @param dockerMocha
 * @param callback
 */
DockerManager.restoreState = function(state, project, dockerMocha, callback)
{
    console.log("Restoring state: " + state);

    if(dockerMocha.noCheckpoint)
    {
        //in the event for tests when no checkpoint
        DockerManager.startVanillaWithSetups(state, project, dockerMocha, (info) =>
        {
            callback(info);
        })
    }
    else
    {
        DockerManager.checkIfStateExists(state, dockerMocha, (exists) =>
        {
            //in the event when creating a state where it does not exist
            if(!exists)
            {
                console.log("State: " + state + " does not exist! creating....");

                DockerManager.createState(state, dockerMocha, (info) =>
                {
                    callback(info);
                })
            }
            else //in the event when running a test, the state already exists
            {
                console.log("State: " + state + " already exists");

                DockerManager.startEnvironment(project, state, dockerMocha, (info) =>
                {
                    DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
                    {
                        callback(info);
                    })
                })
            }
        })
    }


};

/**
 * Creates the state
 * @param state
 * @param dockerMocha
 * @param callback
 */
DockerManager.createState = function(state, dockerMocha, callback)
{
    console.log("Creating State: " + state);

    const stateParent = dockerMocha.getStateParent(state);

    DockerManager.checkIfStateExists(stateParent, dockerMocha, (exists) =>
    {
        //in the event when creating the state and the parent does not exist
        //WITH THE NEW CHANGES IT NEVER HAPPENS
        if(!exists)
        {
            DockerManager.createState(stateParent, dockerMocha, () =>
            {
                DockerManager.stopEnvironment(stateParent, stateParent, dockerMocha, () =>
                {
                    DockerManager.startEnvironment(state, state, dockerMocha, (info) =>
                    {
                        DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
                        {
                            DockerManager.runSetup(info.entrypoint, state, dockerMocha,(err, result) =>
                            {
                                DockerManager.saveEnvironment(state, dockerMocha, () =>
                                {
                                    callback(info);
                                })
                            })
                        })
                    })
                })
            })
        }
        else //In the event when creating a state and the father exists
        {
            DockerManager.startEnvironment(state, stateParent, dockerMocha, (info) =>
            {
                DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
                {
                    DockerManager.runSetup(info.entrypoint, state, dockerMocha,(err, result) =>
                    {
                        DockerManager.saveEnvironment(state, dockerMocha, () =>
                        {
                            callback(info);
                        })
                    })
                })
            })
        }
    })
};

//Only When running no checkpoint tests
DockerManager.startVanillaWithSetups = function(state, project, dockerMocha, callback)
{
    DockerManager.startEnvironment(project, null, dockerMocha, (info) =>
    {
        DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
        {
            DockerManager.runSetups(info.entrypoint, state, dockerMocha, (err, result) =>
            {
                callback(info);
            })
        });
    })
};



/**
 * ======================
 * State Handle Functions
 * ======================
 * @param environment
 * @param state
 * @param dockerMocha
 * @param callback
 */
DockerManager.startEnvironment = function(environment, state, dockerMocha, callback)
{
    if(Utils.isNull(state))
    {
        state = vanillaString;
    }

    console.log(`Starting environment: ${environment} with state ${state}. docker-compose -f '${dockerMocha.composeFile}' -p ${environment} up -d` );

    let copyOfEnv = JSON.parse(JSON.stringify(process.env));
    _.extend(copyOfEnv, {
        STATE: state,
        ENVIRONMENT: environment
    });

    const newProcess = childProcess.exec(`docker-compose -f '${dockerMocha.composeFile}' -p ${environment} up -d`,
        {
            env: copyOfEnv
        },
        (err, result) =>
        {
            if(err)
              console.log("STARTENVIRONMENT: ", err, result);

            let info = {};
            info.entrypoint = environment + '.' + dockerMocha.entrypoint;

            callback(info);
        });

    logEverythingFromChildProcess(newProcess);
};
/**
 *
 * @param environment, the running containers name
 * @param dockerMocha
 * @param callback
 */
DockerManager.saveEnvironment = function(environment, dockerMocha, callback)
{
    DockerManager.getAllServicesInOrchestra(dockerMocha, (services) => {

        console.log("Saving state: " + environment);

        async.mapSeries(services,
            (service, callback) => {
                // console.log("Saving state: " + environment, `'docker commit ${environment}.${service.name} ${service.image}:${service.tag}${environment}'`);

                const newProcess = childProcess.exec(`docker commit ${environment}.${service.name} ${service.image}:${service.tag}${environment}`,
                    (err, result) =>
                    {
                        if(err)
                          console.log("SAVESTATE: ", err, result);

                        callback();
                    });

                // logEverythingFromChildProcess(newProcess);
            },
            (err, results) => {
                callback();
            });
    })
};

DockerManager.stopEnvironment = function(environment, state, dockerMocha, callback)
{
    if(Utils.isNull(state))
    {
        state = vanillaString;
    }

    console.log(`Stopping state. Created ${environment} from base ${state}. 'export STATE='${state}' && export ENVIRONMENT='${environment}' && docker-compose -f '${dockerMocha.composeFile}' -p ${environment} down'`);

    const newProcess = childProcess.exec(`export STATE='${state}' && export ENVIRONMENT='${environment}' && docker-compose -f '${dockerMocha.composeFile}' -p ${environment}  down`,
        (err, result) =>
        {
            if(err)
              console.log("STOPENVIRONMENT: ", err, result);

            callback(err);
        });

    // logEverythingFromChildProcess(newProcess);
};

DockerManager.logEntrypoint = function(entrypoint, dockerMocha, callback)
{
    const newProcess = childProcess.exec(`docker logs ${entrypoint}`,
      (err, result) =>
      {
          callback(err);
      });

    logEverythingFromChildProcess(newProcess);
};

/**
 * Verifies the existence of a given state. Returns true or false accordingly.
 * @param state
 * @param dockerMocha
 * @param callback
 */
DockerManager.checkIfStateExists = function(state, dockerMocha, callback)
{
    //in case it reaches the root, the root always exists
    if(Utils.isNull(state))
    {
        callback(true);
        return;
    }

    DockerManager.getAllServicesInOrchestra(dockerMocha,(services) =>
    {
        if(Utils.isNull(services))
            callback(null);
        else
        {
            console.log("Checking if state exists: " + state);
            async.mapSeries(services,
                (service, callback) =>
                {
                    // console.log(`'docker image inspect "${service.image}:${service.tag}${state}"'`);

                    const newProcess = childProcess.exec(`docker image inspect "${service.image}:${service.tag}${state}"`,
                        (err, result) =>
                        {
                            if(!err && result)
                            {
                                callback(null, true)
                            }
                            else
                            {
                                callback(null, false);
                            }
                        });

                    // logEverythingFromChildProcess(newProcess);
                },
                (err, results)=>
                {
                    for(const i in results)
                    {
                        if (results[i] === false)
                        {
                            callback(false);
                            return;
                        }
                    }
                    callback(true);
                });
        }
    });
};



/**
 * ===============================
 * Container Interaction functions
 * ===============================
 */
DockerManager.runSetup = function(container, state, dockerMocha, callback)
{
    const setupPath = dockerMocha.getStateSetup(state);

    let configOption = "";

    if(!Utils.isNull(dockerMocha.deployment_config))
    {
        configOption = `--config='${dockerMocha.deployment_config}'`
    }

    const command = `docker exec ${container} ${dockerMochaCommand} --setupFile ${setupPath} ${configOption}`;
    console.log("Running setup in: " + container + " . " + command);

    const newProcess = childProcess.exec(command,
        (err, result) =>
        {
            //console.log("RUNSETUP", err, result);
            callback(err, result);
        });

    logEverythingFromChildProcess(newProcess);
};


DockerManager.runSetups = function(container, state, dockerMocha, callback)
{
    const hierarchy = dockerMocha.getHierarchy(state);

    async.mapSeries(hierarchy,
        (hierarchyState, callback) =>
        {
            DockerManager.runSetup(container, hierarchyState, dockerMocha,() =>
            {
                callback();
            })
        },
        (err, results)=>
        {
            callback();
        });
};

DockerManager.runTest = function(container, test, testPath, dockerMocha, callback)
{
    let configOption = "";

    if(!Utils.isNull(dockerMocha.deployment_config))
    {
        configOption = `--config='${dockerMocha.deployment_config}'`
    }

    const command = `docker exec ${container} ${dockerMochaCommand} --testFile ${testPath} --setupFile ${setupPath} ${configOption}`;
    console.log("Running test: " + test + " . " + command);

    const newProcess = childProcess.exec(command,
        (err, result) =>
        {
            callback(err, result);
        });

    logEverythingFromChildProcess(newProcess);
};

/**
 * Retrieve a container IP
 * @param container
 * @param callback
 */
DockerManager.getContainerIP = function(container, callback)
{
    const newProcess = childProcess.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${container}`,
        (err, result) => {
            callback(null, result.slice(0, -1));
        });

    // logEverythingFromChildProcess(newProcess);
};

DockerManager.waitForConnection = function(container, port, callback)
{
    console.log(`Waiting for container ${container} to get online...`);

    DockerManager.getContainerIP(container, (err, ip) =>
    {
        if(!err && validIP(ip))
        {
            DockerManager.loopUp(container, ip, port, ()=>
            {
                callback();
            })
        }
        else
        {
            DockerManager.waitForConnection(container, port, callback);
        }

    })
};

DockerManager.loopUp = function(container, address, port, callback)
{
    console.log("Checking connectivity on " + address + ":" + port);
    DockerManager.checkConnection(container, address, port,
        (err) =>
        {
           if(err)
           {
               setTimeout(function()
               {
                   DockerManager.loopUp(container, address, port, () =>
                   {
                       callback();
                   })
               },1000);
           }
           else
           {
               callback();
           }
        });
};


/**
 * Check network connection, different behaviour for windows and linux-based
 * @param container
 * @param address
 * @param port
 * @param callback
 */
DockerManager.checkConnection = function(container, address, port, callback)
{



    /*
    let fullUrl = "http://" + address;

    if (port)
    {
        fullUrl = fullUrl + ":" + port;
    }

    request.get({
        url: fullUrl,
        timeout:500
    },
    function (e, r, data)
    {
        if (!e)
        {
            if (textToExpectOnSuccess && data.indexOf(textToExpectOnSuccess) > -1)
            {
                callback(null);
            }
            else if (!textToExpectOnSuccess)
            {
                callback(null);
            }
            else
            {
                callback(1, "Response not matched when checking for connectivity on " + address + " : " + port);
            }
        }
        else
        {
            // consider empty response to be a success
            if (e.code === "ECONNRESET" && textToExpectOnSuccess === "")
            {
                callback(null);
            }
            else
            {
                callback(1, "Unable to contact Server at " + address + " : " + port);
            }
        }
    });
    */

    DockerManager.runCommand(container, `wget --tries=1 localhost:${port} > /dev/null 2>&1`,
        (err, result) =>
        {
            if(err === 0)
                callback(null);
            else
                callback(err);
        },
        true);
};

/**
 * Runs a command (cmd) in a specific (container), callback invoked when it finishes, returns success of failure and
 * the result
 * @param container
 * @param cmd
 * @param callback
 */
DockerManager.runCommand = function(container, cmd, callback, muteLog)
{
    const newProcess = childProcess.exec(`docker exec ${container} ${cmd}`,
        (err, result) =>
        {
            if(Utils.isNull(err))
                callback(0, result);
            else
                callback(err.code, result);
        });

        if(!muteLog)
          logEverythingFromChildProcess(newProcess);
};


module.exports = DockerManager;
