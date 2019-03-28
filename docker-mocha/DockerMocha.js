class DockerMocha
{
    constructor()
    {
        this.testHierarch = [];
        this.testList = [];
        this.composeContents = [];
        this.composeFile = null;
        this.entrypoint = null;
    }

    addTest(test)
    {
        if(test.name && test.test)
        {
            this.testHierarch.push({name: test.name, parent: test.parent, test: test.test, setup: test.setup, init: test.init});
            this.testList.push({name: test.name, parent: test.parent, test: test.test, setup: test.setup, init: test.init});
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
        const parent = test.parent;

        if(parent === null)
            return null;

        for(let i in this.testHierarch)
        {
            if(this.testHierarch[i].name === parent)
            {
                return this.testHierarch[i];
            }
        }
    }

    getHierarchy(test)
    {
        if(test === null)
            return null;

        let hierarchy = [];
        hierarchy.push(test);

        let parent = this.getParent(test);

        while(parent !== null)
        {
            hierarchy.unshift(parent);
            parent = this.getParent(parent);
        }

        return hierarchy;
    }

    print()
    {
        for(let i in this.testList)
        {
            const test = this.testList[i];
            console.log(
                "Name: " + test.name +
                "; Parent: " + test.parent +
                "; Test: " + test.test +
                "; Setup: " + test.setup +
                "; Init: " + test.init);
        }

        //console.log("Entrypoint: " + this.entrypoint);
        //console.log(this.composeFile);
        //console.log(this.composeContents);
    }
}

module.exports = DockerMocha;