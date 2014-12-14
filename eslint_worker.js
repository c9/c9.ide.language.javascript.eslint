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
var defaultEnvs = {
    "browser": true,
    "amd": true,
    "builtin": true,
    "node": true,
    "jasmine": false,
    "mocha": false
};

handler.init = function(callback) {
    var rules = defaultRules = linter.defaults().rules;
    
    // Semantic rule defaults
    rules["no-process-exit"] = 0;
    rules["no-console"] = 0;
    rules["no-path-concat"] = 0;
    rules["handle-callback-err"] = 1;
    rules["no-debugger"] = 1;
    rules["valid-jsdoc"] = 0;
    rules["no-undefined"] = 1;
    rules["no-undef"] = 1;
    rules["no-use-before-define"] = [1, "nofunc"];
    rules["no-shadow"] = 1;
    rules["no-inner-declarations"] = [1, "functions"];

    // Forgive dangling comma disliked by old IE
    // (may be controversial)
    rules["no-comma-dangle"] = 0;
    
    // Disable all of opinionated style rules
    // (copied from http://eslint.org/docs/rules/)
    rules["brace-style"] = 0;
    rules["camelcase"] = 0;
    rules["comma-spacing"] = 0;
    rules["comma-style"] = 0;
    rules["consistent-this"] = 0;
    rules["eol-last"] = 0;
    rules["func-names"] = 0;
    rules["func-style"] = 0;
    rules["key-spacing"] = 0;
    rules["max-nested-callbacks"] = 0;
    rules["new-cap"] = 0;
    rules["new-parens"] = 0;
    rules["no-array-constructor"] = 0;
    rules["no-inline-comments"] = 0;
    rules["no-lonely-if"] = 0;
    rules["no-mixed-spaces-and-tabs"] = 0;
    rules["no-multiple-empty-lines"] = 0;
    rules["no-nested-ternary"] = 0;
    rules["no-new-object"] = 0;
    rules["no-space-before-semi"] = 0;
    rules["no-spaced-func"] = 0;
    rules["no-ternary"] = 0;
    rules["no-trailing-spaces"] = 0;
    rules["no-underscore-dangle"] = 0;
    rules["no-wrap-func"] = 0;
    rules["one-var"] = 0;
    rules["operator-assignment"] = 0;
    rules["padded-blocks"] = 0;
    rules["quote-props"] = 0;
    rules["quotes"] = 0;
    rules["semi"] = 0;
    rules["sort-vars"] = 0;
    rules["space-after-keywords"] = 0;
    rules["space-before-blocks"] = 0;
    rules["space-in-brackets"] = 0;
    rules["space-in-parens"] = 0;
    rules["space-infix-ops"] = 0;
    rules["space-return-throw-case"] = 0;
    rules["space-unary-ops"] = 0;
    rules["spaced-line-comment"] = 0;
    rules["wrap-regex"] = 0;

    // So-called "best practices", like curlies in if :o
    rules["curly"] = 0;
    rules["eqeqeq"] = 0;
    rules["dot-notation"] = 0;
    rules["no-alert"] = 0;
    rules["no-caller"] = 0;
    rules["no-empty-label"] = 0;
    rules["no-eval"] = 1;
    rules["no-extra-bind"] = 0;
    rules["no-iterator"] = 0;
    rules["no-labels"] = 0;
    rules["no-lone-blocks"] = 0;
    rules["no-multi-spaces"] = 0;
    rules["no-multi-str"] = 0;
    rules["no-native-reassign"] = 1;
    rules["no-new"] = 0;
    rules["no-new-func"] = 1;
    rules["no-new-wrappers"] = 1;
    rules["no-return-assign"] = 0;
    rules["no-script-url"] = 0;
    rules["no-self-compare"] = 0;
    rules["no-sequences"] = 0;
    rules["no-unused-expressions"] = 0;
    rules["radix"] = 1;
    
    // Strict mode nagging
    rules["global-strict"] = 0;
    rules["no-extra-strict"] = 0;
    rules["strict"] = 0;
    
    callback();
};

handler.handlesLanguage = function(language) {
    return language === 'javascript' || language == 'jsx';
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
        "all",
        handler.isFeatureEnabled("unusedFunctionArgs") ? "all" : "none"
    ];
    defaultRules["no-undef"] =
        handler.isFeatureEnabled("undeclaredVars") ? 3 : 0;
    defaultRules["semi"] =
        handler.isFeatureEnabled("semi") ? 3 : 0;

    // TODO: use .eslintrc from user's project :)
    var messages = linter.verify(value, {
        settings: {
            ecmascript: 6,
            jsx: true
        },
        env: defaultEnvs,
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

        var ec;
        if (m.message.match(/is defined but never used|is not defined|was used before it was defined/)) {
            var line = doc.getLine(m.line - 1);
            var id = workerUtil.getFollowingIdentifier(line, m.column)
            ec = m.column + id.length
        }
            
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
