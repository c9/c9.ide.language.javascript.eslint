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

var defaultRules;
var defaultEnv = {
    "browser": false,
    "amd": true,
    "builtin": true,
    "node": true,
    "jasmine": false,
    "mocha": false
};
var defaultGlobals = require("plugins/c9.ide.language.javascript/scope_analyzer").GLOBALS;

handler.init = function(callback) {
    var rules = defaultRules = {};
    
    rules["handle-callback-err"] = 1;
    rules["no-debugger"] = 1;
    rules["no-undef"] = 1;
    // too buggy:
    // rules["no-use-before-define"] = [3, "nofunc"];
    // to annoying:
    // rules["no-shadow"] = 3;
    rules["no-inner-declarations"] = [1, "functions"];
    rules["no-native-reassign"] = 1;
    rules["no-new-func"] = 1;
    rules["no-new-wrappers"] = 1;
    rules["no-cond-assign"] = [1, "except-parens"];
    rules["no-debugger"] = 3;
    rules["no-dupe-keys"] = 3;
    rules["no-eval"] = 2;
    rules["no-func-assign"] = 1;
    rules["no-extra-semi"] = 3;
    rules["no-invalid-regexp"] = 1;
    rules["no-irregular-whitespace"] = 3;
    rules["no-negated-in-lhs"] = 1;
    rules["no-regex-spaces"] = 3;
    rules["no-reserved-keys"] = 3;
    rules["no-unreachable"] = 1;
    rules["use-isnan"] = 2;
    rules["valid-typeof"] = 1;
    rules["no-redeclare"] = 3;
    rules["no-with"] = 1;
    rules["radix"] = 3;
    rules["no-delete-var"] = 2;
    rules["no-label-var"] = 3;
    rules["no-shadow-restricted-names"] = 2;
    rules["handle-callback-err"] = 1;
    rules["no-new-require"] = 2;

    for (var r in rules) {
        if (!(r in linter.defaults().rules))
            throw new Error("Unknown rule: ", r);
    }
    
    callback();
};

handler.handlesLanguage = function(language) {
    return language === "javascript" || language == "jsx";
};

handler.analyze = function(value, ast, callback) {
    callback(handler.analyzeSync(value, ast));
};

handler.getMaxFileSizeSupported = function() {
    // .5 of current base_handler default
    return .5 * 10 * 1000 * 80;
};

handler.analyzeSync = function(value, ast) {
    var doc = this.doc;
    var markers = [];
    if (!workerUtil.isFeatureEnabled("hints"))
        return markers;

    defaultRules["no-unused-vars"] = [
        3,
        {
            vars: "all",
            args: handler.isFeatureEnabled("unusedFunctionArgs") ? "all" : "none"
        }
    ];
    defaultRules["no-undef"] =
        handler.isFeatureEnabled("undeclaredVars") ? 1 : 0;
    defaultRules["semi"] =
        handler.isFeatureEnabled("semi") ? 3 : 0;

    var isJson = this.path.match(/\.(json|run|settings|build)$/);
    if (isJson)
        value = "!" + value;

    var messages = linter.verify(value, {
        settings: {
            ecmascript: 6,
            jsx: true
        },
        env: defaultEnv,
        globals: defaultGlobals,
        rules: defaultRules
    });
    
    messages.forEach(function(m) {
        var level;
        if (m.severity === 2)
            level = "error";
        else if (m.severity === 1)
            level = "warning";
        else
            level = "info";
        
        if (isJson && level !== "error")
            return;

        if (m.message.match(/(.*) is defined but never used/)) {
            if (RegExp.$1.toUpperCase() === RegExp.$1)
                return; // ignore unused constants
        }

        var ec;
        if (m.message.match(/is not defined|was used before it was defined|is already declared|is already defined|unexpected identifier/i)) {
            var line = doc.getLine(m.line - 1);
            var id = workerUtil.getFollowingIdentifier(line, m.column);
            if (m.message.match(/is already defined/) && line.match("for \\(var " + id))
                return;
            ec = m.column + id.length;
        }
        if (m.message.match(/missing semicolon/i)) {
            var line = doc.getLine(m.line - 1);
            if (line.substr(m.column).match(/\s*}/))
                return; // allow missing semi at end of block
        }
        if (m.message.match(/unexpected identifier/i))
            m.column--; // work around column offset bug
            
        markers.push({
            pos: {
                sl: m.line - 1,
                sc: m.column,
                ec: ec
            },
            level: level,
            message: m.message
        });
    });
    return markers;
};
    
});
