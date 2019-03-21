const childProcess = require("child_process");
const async = require("async");
const fs = require("fs");

const DockerManager = function ()
{
};

/**
 * DONE
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
 * DONE
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
 * DONE
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
                DockerManager.startState(test, dockerMocha, (containerInfo) =>
                {
                    callback(containerInfo);
                })
            })
        }
        else
        {
            DockerManager.startState(test, dockerMocha, (containerInfo) =>
            {
                callback(containerInfo);
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

};


/**
 * TODO
 * @param test
 * @param dockerMocha
 * @param calback
 */
DockerManager.startState = function(test, dockerMocha, callback)
{
    callback(null);
};





























module.exports = DockerManager;