class DockerMocha
{
    constructor()
    {
        this.testQueue = [];

        this.testsMap = {};
        this.childrenMap = {};

        this.composeContents = [];
        this.composeFile = null;
        this.entrypoint = null;

        this.rootTest = null;
    }

    addTest(test)
    {
        if(test.name && test.test)
        {
            //add the Root test
            if(test.parent === null)
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

            /**
             * temp
             */
            this.testQueue.push(test);

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
        return this.testsMap[test.parent];
    }

    testExists(name)
    {
        return name in this.testsMap;
    }

    getHierarchy(test)
    {
        if(test === null)
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

        //console.log("Entrypoint: " + this.entrypoint);
        //console.log(this.composeFile);
        //console.log(this.composeContents);
    }
}

module.exports = DockerMocha;