const childProcess = require("child_process");
const yaml = require("js-yaml");
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
            callback(false);
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

    const containerKeys = Object.keys(dockerCompose.services);

    console.log(containerKeys);
    callback(containerKeys);
};

module.exports = DockerManager;