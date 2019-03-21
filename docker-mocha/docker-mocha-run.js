const DockerMocha = require("./DockerMocha");
const DockerManager = require("./DockerManager");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");

const defaultFileName = "tests.json";
const defaultFile = path.join(process.cwd(), defaultFileName);
let overrideFile = null;
let composeFile = null;

const TIMEOUT = 100;

const DEFAULT_TRHEAD = 4;
let threadsNumber = DEFAULT_TRHEAD;

let defaultExists = false;
let overrideExists = false;

const dockerMocha = new DockerMocha();
let running = 0;


for(let i in process.argv)
{
    //Check if file flag exists
    if(process.argv[i] === "-f" || process.argv[i] === "--file")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            overrideFile = path.join(process.cwd(), process.argv[Number(i) + 1]);
        }
    }

    //Check if threads flag exists
    if(process.argv[i] === "-t" || process.argv[i] === "--threads")
    {
        if((Number(i) + 1) < process.argv.length && Number.isInteger(Number(process.argv[Number(i) + 1])))
        {
            threadsNumber = Number(process.argv[Number(i) + 1])
        }
    }

    //Check if alternate docker compose exists
    if(process.argv[i] === "-c" || process[i] === "--compose")
    {
        if((Number(i) + 1) < process.argv.length)
        {
            composeFile = path.join(process.cwd(), process.argv[Number(i) + 1]);
        }
    }
}

try
{
    //verify if the other *.json tests file exists
    if(overrideFile != null && fs.existsSync(overrideFile))
        overrideExists = true;
}
catch(err) {
    overrideExists = false;}

try
{
    //verify if the default *.json tests file exists
    if(defaultFile != null && fs.existsSync(defaultFile))
        defaultExists = true;
}
catch(err)
{
    defaultExists = false;}

try
{
    //verify if compose file exists
    if(composeFile != null)
        fs.existsSync(composeFile)
}
catch (err)
{
    console.warn("WARN: Specified Compose file not found, using default");
    composeFile = null;
}

if(!defaultExists && !overrideExists)
{
    console.error("ERROR: No Default file or Override file found");
    process.exit(1);
}
else
{
    let fileToUse = null;

    if(!overrideExists)
    {
        fileToUse = defaultFile;
        console.warn("WARN: Override file not found using default File");
    }
    else
    {
        fileToUse = overrideFile;
        console.info("INFO: Using override file: " + overrideFile);
    }

    //Loading compose File
    if(composeFile === null)
    {
        try
        {
            let composeContents = yaml.safeLoad(fs.readFileSync("docker-compose.yml"));
            composeFile = path.join(process.cwd(), "docker-compose.yml");
            dockerMocha.addComposeFile(composeFile, composeContents);
            console.info("INFO: Using default docker-compose.yml");
        }
        catch (e)
        {
            console.error("ERROR: No default docker-compose.yml");
            process.exit(1);
        }
    }
    else
    {
        try
        {
            let composeContents = yaml.safeLoad(fs.readFileSync(composeFile));
            dockerMocha.addComposeFile(composeFile, composeContents);
            console.info("INFO: Using specified compose file: " + composeFile);
        }
        catch (e)
        {
            console.error("ERROR: Could not load file: " + composeFile);
            process.exit(1);
        }
    }

    //Informing threads number
    console.info("INFO: Using " + threadsNumber + " thread(s)");

    //Parsing tests from *.json tests file
    const tests = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));

    //For each test verify if the test file and setup file exist. Add to docker mocha if positive
    for(let i in tests)
    {
        let file = path.join(path.dirname(fileToUse), tests[i].test);
        file = path.relative(process.cwd(), file);

        let setup;

        if(tests[i].setup === null)
            setup = null;
        else {
            setup = path.join(path.dirname(fileToUse), tests[i].setup);
            setup = path.relative(process.cwd(), setup);
        }

        let fileExists = false;
        let setupExists = false;
        let repeated = false;

        try
        {
            if(file != null && fs.existsSync(file))
                fileExists = true;
        }
        catch(err) {
            fileExists = false;}

        try
        {
            if(setup === null)
                setupExists = true;
            else if(fs.existsSync(setup))
                setupExists = true;
        }
        catch(err) {
            setupExists = false;}

        //check if test name aleady exists
        for(let j in dockerMocha.testList)
        {
            if(dockerMocha.testList[j].name === tests[i].name)
                repeated = true;
        }

        if(tests[i].name && fileExists && setupExists && !repeated)
        {
            tests[i].test = file;
            tests[i].setup = setup;
            dockerMocha.addTest(tests[i]);
        }
        else
            console.warn("WARN: Ignored: " + JSON.stringify(tests[i]));
    }

    console.log("\nAdded the following tests: ");
    dockerMocha.print();

    manager();
}

function manager()
{
    if(dockerMocha.testList.length > 0 || running > 0)
    {
        if(dockerMocha.testList.length > 0 && running < threadsNumber)
        {
            let test = dockerMocha.testList[0];
            dockerMocha.testList.shift();

            runTest(test, () =>
            {
                running--;
            });

            running++;
        }

        setTimeout(manager, TIMEOUT);
    }
    else
    {
        process.exit(0);
    }
}


function runTest(test, callback)
{
    DockerManager.checkIfStateExists(test, dockerMocha, (exists) =>
    {
        console.log(exists);
        callback();
    })

}