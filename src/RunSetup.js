const async = require("async");


function runSetup(loaderClass)
{
    return new Promise(function(resolve, reject)
    {
        async.series([
            function (callback)
            {
                if(process.env.DOCKER_MOCHA_ENV)
                    loaderClass.init(function(err, result){
                      if(!err)
                      {
                        console.log("Docker-mocha finished init of " + loaderClass.name + " successfully.");
                      }
                      else {
                        console.log("Docker-mocha produced an error running init of " + loaderClass.name + ".");
                        console.log(JSON.stringify(err));
                        console.log(JSON.stringify(result));
                      }

                      callback(err, result);
                    });
                else
                    callback(null);
            },
            function (callback)
            {
                if(process.env.DOCKER_MOCHA_ENV)
                    loaderClass.load(function(err, result){
                      if(!err)
                      {
                        console.log("Docker-mocha finished load of " + loaderClass.name + " successfully.");
                      }
                      else {
                        console.log("Docker-mocha produced an error running load of " + loaderClass.name + ".");
                        console.log(JSON.stringify(err));
                        console.log(JSON.stringify(result));
                      }

                      callback(err, result);
                    });
                else
                    callback(null);
            },
        ], function (err, result) {
            if (!err) {
                console.log("Docker-mocha resolving init/load of " + loaderClass.name + " successfully.");
                resolve(null, result);
            } else {
                console.log("Docker-mocha rejecting init/load of " + loaderClass.name + "!");
                reject(err, result)
            }
        });
    })
}

module.exports.runSetup = runSetup;
