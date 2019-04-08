const Utils = require('./utils');

class DockerMocha
{
    constructor()
    {
        this.referenceMap = {};
        this.testsMap = {};
        this.childrenMap = {};

        this.composeContents = [];
        this.composeFile = null;
        this.entrypoint = null;
        this.port = 3000;

        this.rootTest = null;

        this.noCheckpoint = false;
        this.noDelete = false;
    }

    addTest(test)
    {
        if(test.name && test.test)
        {
            //add the Root test
            if(Utils.isNull(test.parent))
                this.rootTest = test;

            //create Children map
            if (test.parent in this.childrenMap && test.parent !== null)
            {
                let children = this.childrenMap[test.parent];
                children.push(test);
                this.childrenMap[test.parent] = children;
            }
            else if(test.parent !== null)
            {
                this.childrenMap[test.parent] = [test];
            }

            //create test Map
            if(!(test.name in this.testsMap))
            {
                this.testsMap[test.name] = test;
            }

            //create reference Map
            if(!(test.name in this.referenceMap))
            {
                this.referenceMap[test.name] = test;
            }

            return true;
        }
        else
            return false;
    }

    addComposeFile(composeFile, composeContents)
    {
        this.composeFile = composeFile;
        this.composeContents = composeContents;
    }

    getParent(test)
    {
        if(Utils.isNull(test))
            return undefined;
        else
            return this.testsMap[test.parent];
    }

    testExists(name)
    {
        return name in this.testsMap;
    }

    getHierarchy(test)
    {
        if(Utils.isNull(test))
            return null;

        let hierarchy = [];
        hierarchy.push(test);

        let parent = this.getParent(test);

        while(parent !== undefined)
        {
            hierarchy.unshift(parent);
            parent = this.getParent(parent);
        }

        return hierarchy;
    }

    print()
    {
        Object.keys(this.testsMap).forEach((key) =>
        {

            const test = this.testsMap[key];
            console.log(
                "Name: " + test.name +
                "; Parent: " + test.parent +
                "; Test: " + test.test +
                "; Setup: " + test.setup +
                "; Init: " + test.init);
        });

        console.log("\n");

        //console.log("Entrypoint: " + this.entrypoint);
        //console.log(this.composeFile);
        //console.log(this.composeContents);
    }
}

module.exports = DockerMocha;