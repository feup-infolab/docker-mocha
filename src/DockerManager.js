const childProcess = require("child_process");
const async = require("async");
const vanillaString = "";
const Utils = require('./utils');
const os = require("os");

const DockerManager = function () {};

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
        async.mapSeries(services,
            (service, callback) =>
            {
                console.log("Deleting all states", `'docker images | grep ${service.image} | tr -s ' ' | cut -d ' ' -f 2 | xargs -I {} docker rmi ${service.image}:{}'`);

                childProcess.exec(`docker images | grep ${service.image} | tr -s ' ' | cut -d ' ' -f 2 | xargs -I {} docker rmi ${service.image}:{}`,
                    (err, result) =>
                    {
                        callback();
                    })
            },
            (err, results)=>
            {
                callback();
            });
    })
};

DockerManager.stopAllContainers = function(callback)
{
    console.log("Stopping all containers", "'docker stop $(docker ps -a -q)'");

    childProcess.exec('docker stop $(docker ps -a -q)',
        (err, result) =>
        {
            callback();
        })
};

DockerManager.removeAllContainers = function(callback)
{
    console.log("Removing all containers", "'docker rm $(docker ps -a -q)'");

    childProcess.exec('docker rm $(docker ps -a -q)',
        (err, result) =>
        {
            callback();
        })
};

DockerManager.removeAllVolumes = function(callback)
{
    console.log("Removing all volumes", "'docker volume prune -f'");

    childProcess.exec('docker volume prune -f',
        (err, result) =>
        {
            callback();
        })

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
        DockerManager.startVanillaWithSetups(state, dockerMocha, (info) =>
        {
            info.parent = null;
            callback(info);
        })
    }
    else
    {
        DockerManager.checkIfStateExists(state, dockerMocha, (exists) =>
        {
            if(!exists)
            {
                console.log("State: " + state + " does not exist! creating....");

                DockerManager.createState(state, dockerMocha, (info) =>
                {
                    info.parent = dockerMocha.getParent(state);
                    callback(info);
                })
            }
            else
            {
                console.log("State: " + state + " already exists");

                DockerManager.startState(state, test, dockerMocha, (info) =>
                {
                    DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
                    {
                        info.parent = test;
                        callback(info);
                    })
                })
            }
        })
    }


};

/**
 * Creates the state
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.createState = function(test, dockerMocha, callback)
{
    console.log("Creating State: " + test.name);

    const parent = dockerMocha.getParent(test);
    const parentParent = dockerMocha.getParent(parent);

    DockerManager.checkIfStateExists(test.parent, dockerMocha, (exists) =>
    {
        if(!exists)
        {
            DockerManager.createState(parent, dockerMocha, () =>
            {
                DockerManager.stopState(parent, parentParent, dockerMocha, () =>
                {
                    DockerManager.startState(test, parent, dockerMocha, (info) =>
                    {
                        DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
                        {
                            DockerManager.runSetup(info.entrypoint, test, (err, result) =>
                            {
                                DockerManager.saveState(test, dockerMocha, () =>
                                {
                                    callback(info);
                                })
                            })
                        })
                    })
                })
            })
        }
        else
        {
            DockerManager.startState(test, parent, dockerMocha, (info) =>
            {
                DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
                {
                    DockerManager.runSetup(info.entrypoint, test, (err, result) =>
                    {
                        DockerManager.saveState(test, dockerMocha, () =>
                        {
                            callback(info);
                        })
                    })
                })
            })
        }
    })
};


DockerManager.startVanillaWithSetups = function(test, dockerMocha, callback)
{
    DockerManager.startState(test, null, dockerMocha, (info) =>
    {
        DockerManager.waitForConnection(info.entrypoint, dockerMocha.port, () =>
        {
            DockerManager.runSetups(info.entrypoint, test, dockerMocha, (err, result) =>
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

    console.log("Starting environment: " + environment,`'export STATE='${state}' && export ENVIRONMENT='${environment}' && docker-compose -f '${dockerMocha.composeFile}' -p ${environment} up -d'` );

    childProcess.exec(`export STATE='${state}' && export ENVIRONMENT='${environment}' && docker-compose -f '${dockerMocha.composeFile}' -p ${environment} up -d`,
        (err, result) =>
        {
            console.log("STARTENVIRONMENT: ", err, result);

            let info = {};
            info.entrypoint = environment + '.' + dockerMocha.entrypoint;

            callback(info);
        })
};
/**
 *
 * @param environment, the running containers name
 * @param state, the state to be saved
 * @param dockerMocha
 * @param callback
 */
DockerManager.saveState = function(environment, dockerMocha, callback)
{
    DockerManager.getAllServicesInOrchestra(dockerMocha, (services) => {
        async.mapSeries(services,
            (service, callback) => {
                console.log("Saving state: " + environment, `'docker commit ${environment}.${service.name} ${service.image}:${service.tag}${environment}'`);

                childProcess.exec(`docker commit ${environment}.${service.name} ${service.image}:${service.tag}${environment}`,
                    (err, result) =>
                    {
                        console.log("SAVESTATE: ", err, result);
                        callback();
                    })
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

    console.log("Stopping state: " + state, `'export STATE='${state}' && export ENVIRONMENT='${environment}' && docker-compose -f '${dockerMocha.composeFile}' -p ${environment} down'`);

    childProcess.exec(`export STATE='${state}' && export ENVIRONMENT='${environment}' && docker-compose -f '${dockerMocha.composeFile}' -p ${environment}  down`,
        (err, result) =>
        {
            console.log("STOPENVIRONMENT: ", err, result);
            callback();
        })
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
            async.mapSeries(services,
                (service, callback) =>
                {
                    console.log("Checking if state exists: " + state, `'docker image inspect "${service.image}:${service.tag}${state}"'`);

                    childProcess.exec(`docker image inspect "${service.image}:${service.tag}${state}"`,
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
                        })
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
DockerManager.runSetup = function(container, test, callback)
{
    console.log("Running setup in: " + container, `'docker exec ${container} node ${test.setup}'`);

    DockerManager.runCommand(container, `node ${test.setup}`, (err, result) =>
    {
        console.log("RUNSETUP", err, result);
        callback(err, result);
    });
};


DockerManager.runSetups = function(container, test, dockerMocha, callback)
{
    const hierarchy = dockerMocha.getHierarchy(test);

    async.mapSeries(hierarchy,
        (hierarchyTest, callback) =>
        {
            DockerManager.runSetup(container, hierarchyTest, () =>
            {
                callback();
            })
        },
        (err, results)=>
        {
            callback();
        });
};

DockerManager.runTest = function(container, test, testPath, callback)
{
    console.log("Running test: " + test, `'docker exec ${container} ./node_modules/mocha/bin/mocha  ${testPath}'`);

    DockerManager.runCommand(container, `./node_modules/mocha/bin/mocha  ${testPath}`, (err, result) =>
    {
        //console.log("RUNTESET", err, result);
        callback(err, result);
    })
};

/**
 * Retrieve a container IP
 * @param container
 * @param callback
 */
DockerManager.getContainerIP = function(container, callback)
{
    childProcess.exec(`docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${container}`,
        (err, result) => {
            callback(null, result.slice(0, -1));
        })
};

DockerManager.waitForConnection = function(container, port, callback)
{
    console.log(`Waiting for container ${container} to get online...`);

    DockerManager.getContainerIP(container, (err, ip) =>
    {
        DockerManager.loopUp(ip, port, ()=>
        {
            callback();
        })
    })
};

DockerManager.loopUp = function(address, port, callback)
{
    //console.log(address, port);
    DockerManager.checkConnection(address, port,
        (err) =>
        {
           if(err)
           {
               DockerManager.loopUp(address, port, () =>
               {
                   callback();
               })
           }
           else
           {
               callback();
           }
        });
};


/**
 * Check network connection, different behaviour for windows and linux-based
 * @param address
 * @param port
 * @param callback
 */
DockerManager.checkConnection = function(address, port, callback)
{
    {
        childProcess.exec(`nc -z ${address} ${port}`,
            (err, result) =>
            {
                //console.log(err, result);
                callback(err);
            })
    }
};

/**
 * Runs a command (cmd) in a specific (container), callback invoked when it finishes, returns success of failure and
 * the result
 * @param container
 * @param cmd
 * @param callback
 */
DockerManager.runCommand = function(container, cmd, callback)
{
    childProcess.exec(`docker exec ${container} ${cmd}`,
        (err, result) =>
        {
            if(Utils.isNull(err))
                callback(0, result);
            else
                callback(err.code, result);
        })
};


module.exports = DockerManager;