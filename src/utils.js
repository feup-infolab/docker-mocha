const path = require('path');

const Utils = function () {};

Utils.isNull = function (something)
{
    return something === null || something === undefined;
};

Utils.trimJSExtension = function(fullPath)
{
    return path.join(path.dirname(fullPath), path.parse(fullPath).name);
};

module.exports = Utils;