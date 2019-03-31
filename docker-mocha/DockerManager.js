const childProcess = require("child_process");
const async = require("async");
const vanillaString = "vanilla";
const Utils = require('./utils');
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

/**
 * Restores a state, returning the info of the restored state. It is responsible for creating states if they do not exist
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.restoreState = function(test, dockerMocha, callback)
{
    console.log("Restoring state: " + test.name);

    DockerManager.checkIfStateExists(test.name, dockerMocha, (exists) =>
    {
        if(!exists)
        {
            console.log("State: " + test.name + " does not exist! creating....");

            DockerManager.createState(test, dockerMocha, (info) =>
            {
                info.parent = dockerMocha.getParent(test);
                callback(info);
            })
        }
        else
        {
            console.log("State: " + test.name + " already exists");

            DockerManager.startState(test, test, dockerMocha, (info) =>
            {
                info.parent = test;
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
        }
        else
        {
            DockerManager.startState(test, parent, dockerMocha, (info) =>
            {
                DockerManager.runSetup(info.entrypoint, test, (err, result) =>
                {
                    DockerManager.saveState(test, dockerMocha, () =>
                    {
                        callback(info);
                    })
                })
            })
        }
    })


    //}
};



/**
 * ======================
 * State Handle Functions
 * ======================
 * @param test
 * @param parent
 * @param dockerMocha
 * @param callback
 */
DockerManager.startState = function(test, parent, dockerMocha, callback)
{
    if(Utils.isNull(parent))
    {
        parent = [];
        parent.name = vanillaString;
    }

    console.log("Starting state: " + test.name,`'export PARENT_STATE=${parent.name} && export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} up -d'` );

    childProcess.exec(`export PARENT_STATE=${parent.name} && export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} up -d`,
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
DockerManager.saveState = function(test, dockerMocha, callback)
{
    DockerManager.getAllServicesInOrchestra(dockerMocha, (services) => {
        async.mapSeries(services,
            (service, callback) => {
                console.log("Saving state: " + test.name, `'docker commit ${test.name}.${service.name} ${service.image}:${test.name}'`);

                childProcess.exec(`docker commit ${test.name}.${service.name} ${service.image}:${test.name}`,
                    (err, result) => {
                        callback();
                    })
            },
            (err, results) => {
                callback();
            });
    })
};

DockerManager.stopState = function(test, parent, dockerMocha, callback)
{
    if(Utils.isNull(parent))
    {
        parent = [];
        parent.name = vanillaString;
    }

    console.log("Stopping state: " + test.name, `'export PARENT_STATE=${parent.name} && export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} down'`);

    childProcess.exec(`export PARENT_STATE=${parent.name} && export TEST_NAME=${test.name} && docker-compose -f ${dockerMocha.composeFile} down`,
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
DockerManager.checkIfStateExists = function(testName, dockerMocha, callback)
{
    //in case it reaches the root, the root always exists
    if(Utils.isNull(testName))
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
                    console.log("Checking if state exists: " + testName, `'docker image inspect "${service.image}:${testName}"'`);

                    childProcess.exec(`docker image inspect "${service.image}:${testName}"`,
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
            if(Utils.isNull(err))
                callback(0, result);
            else
                callback(err.code, result);
        })
};


module.exports = DockerManager;