const DockerMocha = require("./DockerMocha");
const path = require("path");
const fs = require("fs");

const defaultFileName = "tests.json";
const defaultFile = path.join(process.cwd(), defaultFileName);
let overrideFile = null;

const DEFAULT_TRHEAD = 4;
let threadsNumber = DEFAULT_TRHEAD;

let defaultExists = false;
let overrideExists = false;

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
    defaultExists = false;
}

if(!defaultExists && !overrideExists)
{
    console.error("No Default file or Override file found");
    process.exit(1);
}
else
{
    let fileToUse = null;

    if(!overrideExists)
    {
        fileToUse = defaultFile;
        console.warn("Override file not found using default File");
    }
    else
    {
        fileToUse = overrideFile;
        console.warn("Using override file");
    }

    //Parsing tests from *.json tests file
    const tests = JSON.parse(fs.readFileSync(fileToUse, 'utf8'));
    const dockerMocha = new DockerMocha();

    //For each test verify if the test file and setup file exist. Add to docker mocha if positive
    for(let i in tests)
    {
        const file = path.join(path.dirname(fileToUse), tests[i].file);
        let setup;

        if(tests[i].setup === null)
            setup = null;
        else
            setup = path.join(path.dirname(fileToUse), tests[i].setup);

        let fileExists = false;
        let setupExists = false;

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

        if(tests[i].title && fileExists && setupExists)
        {
            tests[i].file = file;
            tests[i].setup = setup;
            dockerMocha.addTest(tests[i]);
        }
        else
            console.warn("Ignored: " + JSON.stringify(tests[i]));
    }

    //Launch docker-mocha

    console.log("\nAdded the following tests: ");
    dockerMocha.print();
}