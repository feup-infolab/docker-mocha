const childProcess = require("child_process");
const async = require("async");
let timeout = 100;

const DockerManager = function (OverrideTime)
{
    timeout = OverrideTime;
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

    for(let i in services)
    {
        let service = services[i];
        let container = dockerMocha.composeContents.services[service];

        servicesInfo.push({
            service: service,
            name: container.container_name.replace(/\${.*}\./g, ""),
            image: container.image.replace(/:\${.*}/g, "")
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
                console.log("\nDeleting all states", `'docker images | grep ${service.image} | tr -s ' ' | cut -d ' ' -f 2 | xargs -I {} docker rmi ${service.image}:{}'`);

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

/**
 * Restores a state, returning the info of the restored state. It is responsible for creating states if they do not exist
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.restoreState = function(test, dockerMocha, callback)
{
    console.log("Restoring state: " + test.name);

    DockerManager.checkIfStateExists(test, dockerMocha, (exists) =>
    {
        if(!exists)
        {
            console.log("State: " + test.name + " does not exist! creating....");

            DockerManager.createState(test, dockerMocha, () =>
            {
                DockerManager.startState(test, dockerMocha, (info) =>
                {
                    callback(info);
                })
            })
        }
        else
        {
            console.log("State: " + test.name + "already exists");

            DockerManager.startState(test, dockerMocha, (info) =>
            {
                callback(info);
            })
        }
    })
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

    let parent = dockerMocha.getParent(test);

    //vanilla state
    if(parent === null)
    {
        parent = {};
        parent.name = "vanilla";

        DockerManager.startState(parent, dockerMocha, (info) =>
        {
            DockerManager.runSetup(info.entrypoint, test, () =>
            {
                DockerManager.saveState(test, parent, dockerMocha, () =>
                {
                    DockerManager.stopState(parent, dockerMocha, () =>
                    {
                        callback();
                    })
                })
            })
        })
    }
    else
    {
        DockerManager.checkIfStateExists(parent, dockerMocha, (exists) =>
        {
            if(!exists)
            {
                DockerManager.createState(parent, dockerMocha, () =>
                {
                    DockerManager.startState(parent, dockerMocha, (info) =>
                    {
                        DockerManager.runSetup(info.entrypoint, test, (err, result) =>
                        {
                            DockerManager.saveState(test, parent, dockerMocha, () =>
                            {
                                DockerManager.stopState(parent, dockerMocha, () =>
                                {
                                    callback();
                                })
                            })
                        })
                    })
                })
            }
            else
            {
                DockerManager.startState(parent, dockerMocha, (info) =>
                {
                    DockerManager.runSetup(info.entrypoint, test, (err, result) =>
                    {
                        DockerManager.saveState(test, parent, dockerMocha, () =>
                        {
                            DockerManager.stopState(parent, dockerMocha, () =>
                            {
                                callback();
                            })
                        })
                    })
                })
            }
        })
    }
};



/**
 * ======================
 * State Handle Functions
 * ======================
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.startState = function(test, dockerMocha, callback)
{
    console.log("Starting state: " + test.name,`'export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} up -d'` );

    childProcess.exec(`export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} up -d`,
        (err, result) =>
        {
            let info = {};
            info.entrypoint = test.name + '.' + dockerMocha.entrypoint;

            callback(info);
        })
};
/**
 *
 * @param test, the name of the new state
 * @param parent, the running containers name
 * @param dockerMocha
 * @param callback
 */
DockerManager.saveState = function(test, parent, dockerMocha, callback)
{
    DockerManager.getAllServicesInOrchestra(dockerMocha, (services) => {
        async.mapSeries(services,
            (service, callback) =>
            {
                console.log("Saving state: " + test.name, `'docker commit ${parent.name}.${service.name} ${service.image}:${test.name}'`);

                childProcess.exec(`docker commit ${parent.name}.${service.name} ${service.image}:${test.name}`,
                    (err, result) => {
                        callback();
                    })
            },
            (err, results) => {
                callback();
            });
    })
};

DockerManager.stopState = function(test, dockerMocha, callback)
{
    console.log("Stopping state: " + test.name, `'export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} down'`);

    childProcess.exec(`export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} down`,
        (err, result) =>
        {
            callback();
        })
};

/**
 * Verifies the existence of a given state. Returns true or false accordingly.
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.checkIfStateExists = function(test, dockerMocha, callback)
{
    DockerManager.getAllServicesInOrchestra(dockerMocha,(services) =>
    {
        if(services === null)
            callback(null);
        else
        {
            async.mapSeries(services,
                (service, callback) =>
                {
                    console.log("Checking if state exists: " + test.name, `'docker image inspect "${service.image}:${test.name}"'`);

                    childProcess.exec(`docker image inspect "${service.image}:${test.name}"`,
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
                    for(let i in results)
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
    function func()
    {
        console.log("Running setup in: " + container, `'docker exec ${container} node ${test.setup}'`);

        DockerManager.runCommand(container, `node ${test.setup}`, (err, result) =>
        {
            console.log(err, result);

            callback(err, result);
        });
    }

    setTimeout(func, timeout);
};

DockerManager.runInit = function(container, test, callback)
{
    console.log("Running Init: " + test.name, `'docker exec ${container} node ${test.init}'`);

    DockerManager.runCommand(container, `node ${test.init}`, (err, result) =>
    {
        callback();
    })
};

DockerManager.runInits = function(container, test, dockerMocha, callback)
{
    const hierarchy = dockerMocha.getHierarchy(test);

    async.mapSeries(hierarchy,
        (hierarchyTest, callback) =>
        {
            DockerManager.runInit(container, hierarchyTest, () =>
            {
                callback();
            })
        },
        (err, results)=>
        {
            callback();
        });
};

DockerManager.runTest = function(container, test, callback)
{
    console.log("Running test: " + test.name, `'docker exec ${container} ./node_modules/mocha/bin/mocha  ${test.test}'`);

    DockerManager.runCommand(container, `./node_modules/mocha/bin/mocha  ${test.test}`, (err, result) => {
        callback(err, result);
    })
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
            if(err === null)
                callback(0, result);
            else
                callback(err.code, result);
        })
};


module.exports = DockerManager;