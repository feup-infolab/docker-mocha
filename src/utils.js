const path = require('path');
const async = require("async");
const request = require("request");

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
            60 * 1000
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

Utils.checkConnectivityOnPort = function(port, callback, textToExpectOnSuccess)
{
    const tryToConnect = function (callback)
    {
        const host = "localhost";
        console.log("Checking virtuoso connectivity via HTTP on Port " + port + "...");

        let fullUrl = "http://" + host;

        if (port)
        {
            fullUrl = fullUrl + ":" + port;
        }

        request.get({
                url: fullUrl
            },
            function (e, r, data)
            {
                if (!e)
                {
                    if (data.indexOf(textToExpectOnSuccess) > -1)
                    {
                        callback(null);
                    }
                    else
                    {
                        callback(1, "Response not matched when checking for connectivity on " + host + " : " + port);
                    }
                }
                else
                {
                    if (e.code === "ECONNRESET" && textToExpectOnSuccess === "")
                    {
                        callback(null);
                    }
                    else
                    {
                        callback(1, "Unable to contact Server at " + host + " : " + port);
                    }
                }
            });
    };

    // try calling apiMethod 10 times with linear backoff
    // (i.e. intervals of 100, 200, 400, 800, 1600, ... milliseconds)
    async.retry({
        times: 240,
        interval: function (retryCount)
        {
            const msecs = 1000;
            Logger.log("debug", "Waiting " + msecs / 1000 + " seconds to retry a connection to Virtuoso");
            return msecs;
        }
    }, tryToConnect, function (err)
    {
        if (!err)
        {
            callback(null);
        }
        else
        {
            const msg = `Unable to establish a connection to server in time on: ${host}:${port} This is a fatal error.`;
            console.log(msg);
            throw new Error(msg);
        }
    });
}




module.exports = Utils;