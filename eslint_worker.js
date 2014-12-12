/**
 * Cloud9 Language Foundation
 *
 * @copyright 2014, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var baseLanguageHandler = require('plugins/c9.ide.language/base_handler');
var workerUtil = require('plugins/c9.ide.language/worker_util');
var linter = require("./eslint_browserified");
var handler = module.exports = Object.create(baseLanguageHandler);

handler.handlesLanguage = function(language) {
    return language === 'javascript';
};

handler.analyze = function(value, ast, callback) {
    callback(handler.analyzeSync(value, ast));
};

handler.getMaxFileSizeSupported = function() {
    // .5 of current base_handler default
    return .5 * 10 * 1000 * 80;
};

handler.analyzeSync = function(value, ast) {
    var markers = [];
    if (!workerUtil.isFeatureEnabled("hints"))
        return markers;

    // TODO: use .eslintrc from user's project :)
    var messages = linter.verify(value, {
        envs: ["browser", "amd", "builtin", "node"/*, "jasmine", "mocha"*/],
        rules: {
            "no-process-exit": 0,
            "no-path-concat": 0,
            "handle-callback-err": 1, // default for node
            "no-debugger": 1,
        }
    });
    
    messages.forEach(function(m) {
        markers.push({
            pos: {
                sl: m.line - 1,
                sc: m.column - 1,
            },
            type: m.severity === 2 ? "error" : "warning",
            message: m.message
        });
    });
    return markers;
};
    
});
