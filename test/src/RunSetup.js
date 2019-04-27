const async = require("async");


function runSetup(loaderClass)
{
    return new Promise(function(resolve, reject)
    {
        async.series([
            function (callback)
            {
                loaderClass.init(callback);
            },
            function (callback)
            {
                loaderClass.load(callback);
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