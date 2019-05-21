const Utils = require('./utils');
const async = require("async");
class DockerMocha
{
    constructor()
    {
        this.statesMap = {};
        this.testsMap = {};
        this.dependencyMap = {};

        this.composeContents = [];
        this.composeFile = null;
        this.entrypoint = null;
        // this.port = 3000;

        this.rootState = null;

        this.noCheckpoint = false;
        this.noDelete = false;
        this.noDocke = false;

        this.deployment_config = null;
    }

    addState(state)
    {
        const stateInfo = this.statesMap[state];

        if(!Utils.isNull(stateInfo["depends_on"]))
        {
            if(Utils.isNull(this.dependencyMap[stateInfo["depends_on"]]))
            {
                this.dependencyMap[stateInfo["depends_on"]] = {};
            }
            if(Utils.isNull(this.dependencyMap[stateInfo["depends_on"]]["child_states"]))
            {
                this.dependencyMap[stateInfo["depends_on"]]["child_states"] = [];
            }
            this.dependencyMap[stateInfo["depends_on"]]["child_states"].push(state);
        }
    }

    verifyAndWarnStates()
    {
        let total = 0;
        let bad = 0;

        for(let state in this.statesMap)
        {
            const valid = this.loopStatesParent(state);
            if(!valid)
            {
                bad++;
                console.warn("WARN: state '" + state + "' does not have complete lineage to root");
            }

            total++;
        }

        if(bad > 0)
        {
            console.log("WARN: Some states are invalid, please check the logs above: " + bad + "/" + total + " of total states");
        }
        else
        {
            console.info("INFO: All states parsed and valid");
        }
    }

    loopStatesParent(state)
    {
        const parentState = this.getStateParent(state);

        if(Utils.isNull(parentState))
        {
            return true;
        }
        else if(this.statesMap.hasOwnProperty(parentState))
        {
            return this.loopStatesParent(parentState);
        }
        else
        {
            return false;
        }
    }

    getTestState(test)
    {
        return this.testsMap[test]["state"];
    }

    getTestPath(test)
    {
        return this.testsMap[test]["path"];
    }

    getTestsList()
    {
        return Object.keys(this.testsMap);
    }

    addTest(test, testsProp)
    {
        if(Utils.isNull(this.dependencyMap[testsProp["state"]]))
        {
            this.dependencyMap[testsProp["state"]] = {};
        }
        if(Utils.isNull(this.dependencyMap[testsProp["state"]]["child_tests"]))
        {
            this.dependencyMap[testsProp["state"]]["child_tests"] = [];
        }
        this.dependencyMap[testsProp["state"]]["child_tests"].push(test);
        this.testsMap[test] = testsProp;
    }

    addComposeFile(composeFile, composeContents)
    {
        this.composeFile = composeFile;
        this.composeContents = composeContents;
    }


    getStateParent(state)
    {
        if(Utils.isNull(state))
            return undefined;
        else
            return this.statesMap[state]["depends_on"];
    }

    getStateSetup(state)
    {
        return this.statesMap[state]["path"];
    }

    getHierarchy(state)
    {
        if(Utils.isNull(state))
            return null;

        let hierarchy = [];
        hierarchy.push(state);

        let parent = this.getStateParent(state);

        while(!Utils.isNull(parent))
        {
            hierarchy.unshift(parent);
            parent = this.getStateParent(parent);
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
    }
}


module.exports = DockerMocha;
