const path = require('path');
const async = require("async");

const Utils = function () {};

Utils.isNull = function (something)
{
    return something === null || something === undefined;
};

Utils.getAbsPath = function(relativePath)
{
    return path.join(process.cwd(),path.join(path.dirname(relativePath), path.parse(relativePath).name));
};

Utils.requireFile = function(relativePath)
{
    return require(Utils.getAbsPath(relativePath));
};


/**
 * Yes, i know that it is bad to run synchronous functions in JS.
 * Eat your async await with some mustard on top
 */

Utils.runSync = function(taskList)
{
    let result;
    let error;
    let taskTimeout;
    let sleepTimeout;

    const timeout = function(callback)
    {
        taskTimeout = setTimeout(
            function()
            {
                console.log("Arrived at timeout!");
                if(!result)
                {
                    console.log("Task timed out during synchronous operation");
                    result = "timeout";
                    callback();
                }
            },
            6 * 1000
        );
    };
    const performTasks = function(callback)
    {
        async.series(taskList, function(err, results){
            if(err)
            {
                result = "error";
                error = err;
            }
            else
            {
                result = "ok";
            }

            console.log("Ran all tasks in list with result: "  + result);

            callback(err, results);
            clearTimeout(taskTimeout);
        });
    };

    async.race([
        timeout,
        performTasks
    ]);

    function sleep()
    {
        sleepTimeout = setTimeout(function() {
            if(!result)
            {
                console.log('Operation sleeping...');
                clearTimeout(sleepTimeout);
                sleepTimeout = null;
                sleep();
            }
        }, 100);
    }

    sleep();
};


module.exports = Utils;