const DockerMocha = require("./docker-mocha/docker-mocha")

const dockerMocha = new DockerMocha();

dockerMocha.addTest({
    title: "Init",
    file: "./test/init.js",
    setup: null
});

dockerMocha.addTest({
    title: "SetDollar",
    file: "./test/dollar/setDollar.js",
    setup: "./test/init.js"
});

dockerMocha.addTest({
    title: "testDollar",
    file: "./test/dollar/testDollar.js",
    setup: "./test/dollar/setDollar.js"
});

dockerMocha.addTest({
    title: "SetPound",
    file: "./test/pound/setPound.js",
    setup: "./test/init.js"
});

dockerMocha.addTest({
    title: "testDollar",
    file: "./test/dollar/testDollar.js",
    setup: "./test/dollar/setDollar.js"
});

dockerMocha.print();