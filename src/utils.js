const path = require('path');

const Utils = function () {};

Utils.isNull = function (something)
{
    return something === null || something === undefined;
};

Utils.requireFile = function(relativePath)
{
    return require(path.join(process.cwd(),path.join(path.dirname(relativePath), path.parse(relativePath).name)));
};

module.exports = Utils;