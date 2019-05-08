const async = require("async");


function runSetup(loaderClass)
{
    return new Promise(function(resolve, reject)
    {
        async.series([
            function (callback)
            {
                if(process.env.DOCKER_MOCHA_ENV)
                    loaderClass.init(callback);
                else
                    callback(null);
            },
            function (callback)
            {
                if(process.env.DOCKER_MOCHA_ENV)
                    loaderClass.load(callback);
                else
                    callback(null);
            },
        ], function (err, result) {
            if (!err) {
                resolve(null, result);
            } else {
                reject(err, result)
            }
        });
    })
}

module.exports.runSetup = runSetup;