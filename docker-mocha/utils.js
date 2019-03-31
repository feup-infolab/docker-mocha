const Utils = function () {};

Utils.isNull = function (something)
{
    return something === null || something === undefined;
};

module.exports = Utils;