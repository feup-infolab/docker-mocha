const childProcess = require("child_process");
const async = require("async");
const fs = require("fs");

const DockerManager = function () {};

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
            name: container.container_name,
            image: container.image.replace(/:\${.*}/g, "")
        });

    }

    callback(servicesInfo);
};

/**
 * Restores a state, returning the info of the restored state. It is responsible for creating states if they do not exist
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.restoreState = function(test, dockerMocha, callback)
{
    DockerManager.checkIfStateExists(test, dockerMocha, (exists) =>
    {
        if(!exists)
        {
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
            DockerManager.startState(test, dockerMocha, (info) =>
            {
                callback(info);
            })
        }
    })
};

/**
 * TODO
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.createState = function(test, dockerMocha, callback)
{
    const parent = dockerMocha.getParent(test);

    //vanilla state
    if(parent === null)
    {
        //TODO
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
                        //TODO
                         callback();
                    })
                })
            }
            else
            {
                DockerManager.startState(parent, dockerMocha, (info) =>
                {
                    //TODO
                })
            }
        })
    }
};



/**
 * TODO ALL
 * @param test
 * @param dockerMocha
 * @param callback
 */
DockerManager.startState = function(test, dockerMocha, callback)
{
    callback(null);
};

DockerManager.saveState = function(test, dockerMocha, callback)
{
    callback(null);
};

DockerManager.stopState = function(test, dockerMocha, callback)
{
    callback(null);
};



/**
 * ===============================
 * Container Interaction functions
 * ===============================
 */
DockerManager.runSetup = function(container, test, callback)
{
    DockerManager.runCommand(container, `node ${test.setup}`, (err, result) =>
    {
        callback();
    })
};

DockerManager.runInit = function(container, test, callback)
{
    DockerManager.runCommand(container, `node ${test.init}`, (err, result) =>
    {
        callback();
    })
};

DockerManager.runTest = function(container, test, callback)
{
    DockerManager.runCommand(container, `mocha ${test.test}`, (err, result) =>
    {
        callback(err);
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