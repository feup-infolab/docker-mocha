const childProcess = require("child_process");
const yaml = require("js-yaml");
const async = require("async");
const fs = require("fs");

const DockerManager = function ()
{
};


DockerManager.checkpointExists = function(checkpointName, composeFile, callback)
{
    DockerManager.getAllServicesInOrchestra(composeFile,(services) =>
    {
        if(services === null)
            callback(null);
        else
        {
            async.mapSeries(services,
                (service, callback) =>
                {
                    childProcess.exec(`docker image inspect "${service.image}:${checkpointName}"`,
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

DockerManager.getAllServicesInOrchestra = function(composeFile, callback)
{
    let dockerCompose;

    if(composeFile === null)
    {
        try
        {
            dockerCompose = yaml.safeLoad(fs.readFileSync("docker-compose.yml"));
        }
        catch (e)
        {
            callback(null);
            return;
        }
    }
    else
    {
        try
        {
            dockerCompose = yaml.safeLoad(fs.readFileSync(composeFile));
        }
        catch (e)
        {
            callback(null);
            return;
        }
    }

    const services = Object.keys(dockerCompose.services);
    let servicesInfo = [];

    for(let i in services)
    {
        let service = services[i];
        let container = dockerCompose.services[service];

        servicesInfo.push({
            service: service,
            name: container.container_name,
            image: container.image.replace(/:\${.*}/g, "")
        });

    }

    callback(servicesInfo);
};

module.exports = DockerManager;