class DockerMocha
{
    constructor()
    {
        this.testList = [];
        this.composeContents = [];
        this.composeFile = null;
    }

    addTest(test)
    {
        if(test.name && test.test)
        {
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

        //console.log(this.composeFile);
        //console.log(this.composeContents);
    }
}

module.exports = DockerMocha;