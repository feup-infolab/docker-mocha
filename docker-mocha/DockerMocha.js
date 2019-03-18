class DockerMocha
{
    constructor()
    {
        this.testList = [];

    }

    addTest(test)
    {
        if(test.title && test.file)
        {
            this.testList.push({title: test.title, file: test.file, setup: test.setup});
            return true;
        }
        else
            return false;
    }

    getTests()
    {
        return this.testList;
    }

    print()
    {


        for(let i in this.testList)
        {
            const test = this.testList[i];
            console.log("Title: " + test.title + "; File: " + test.file + "; Setup: " + test.setup);
        }
    }
}

module.exports = DockerMocha;