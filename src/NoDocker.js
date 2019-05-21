const Utils = require('./utils');
const Mocha = require('mocha');
const async = require('async');


exports.noDocker = function(dockerMocha)
{

    const testsList = dockerMocha.getTestsList();

    async.mapSeries(testsList, (test, done2) =>
    {
        const testPath = dockerMocha.getTestPath(test);
        const testState = dockerMocha.getTestState(test);
        const testSetup = dockerMocha.getStateSetup(testState);
        const hierarchy = dockerMocha.getHierarchy(testState);

        //LOADING EVERY STATE
        async.mapSeries(hierarchy, (state, done) =>
            {
                console.log(state);
                const setupFile = dockerMocha.getStateSetup(state);

                const loaderClass = Utils.requireFile(setupFile);
                console.log(`Setting up state ${loaderClass.name} from file ${setupFile}`);

                const taskList = [
                    loaderClass.init,
                    function(callback)
                    {
                        if(dockerMocha.port)
                        {
                            console.log("Waiting for server on port " + dockerMocha.port + " to be available, as specified by the -p argument of docker-mocha.");
                            Utils.checkConnectivityOnPort(dockerMocha.port, callback);
                        }
                        else
                        {
                            console.log("Skipping wait for service bootup as no -p argument was specified.");
                            callback(null);
                        }
                    },
                    function(callback)
                    {
                        console.log("Ran INIT of " + loaderClass.name);
                        callback(null);
                    },
                    loaderClass.load,
                    function(callback)
                    {
                        console.log("Ran LOAD of " + loaderClass.name);
                        callback(null);
                    },
                    loaderClass.shutdown,
                    function(callback)
                    {
                        console.log("Exiting after running shutdown of " + loaderClass.name);
                        callback();
                        done();

                    }
                ];

                Utils.runSync(taskList);
            },
            (err, results) =>
            {
                if(!err)
                {
                    let testsFailed = 1;
                    const loaderClass = Utils.requireFile(testSetup);
                    const taskList = [
                        loaderClass.init,
                        function(callback)
                        {
                            console.log("Ran INIT of " + loaderClass.name + " before test " + testPath);
                            callback(null);
                        },
                        function(callback)
                        {
                            if(dockerMocha.port)
                            {
                                console.log("Waiting for server on port " + dockerMocha.port + " to be available, as specified by the -p argument of docker-mocha.");
                                Utils.checkConnectivityOnPort(dockerMocha.port, callback);
                            }
                            else
                            {
                                callback(null);
                            }
                        },
                        function(callback)
                        {
                            // Instantiate a Mocha instance.
                            const mocha = new Mocha();

                            mocha.addFile(
                                testPath
                            );

                            // Run the tests.
                            mocha.run(function(failures) {
                                testsFailed = failures ? 1 : 0;  // exit with non-zero status if there were failures
                                callback();
                            });
                        },
                        function(callback)
                        {
                            console.log("DOCKER-MOCHA: Started shutdown of " + loaderClass.name);
                            loaderClass.shutdown(function()
                            {
                                console.log("DOCKER-MOCHA: Finished shutdown of " + loaderClass.name + " with error: " + testsFailed);
                                callback(null);
                            });
                        },
                        function(callback)
                        {
                            console.log("Exiting after running shutdown of " + loaderClass.name);
                            callback();
                            done2(testsFailed);
                        }
                    ];

                    Utils.runSync(taskList);
                    console.log("Test executed");
                }
            });
    },
    (err, results) =>
    {
        process.exit(err);
    });


    /*





     */


};