"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceCdata = function (rawText) {
    var cdataRegex = new RegExp("(<!\\[CDATA\\[)([\\s\\S]*?)(\\]\\]>)", "g");
    var matches = rawText.match(cdataRegex);
    if (matches != null && matches.length > 0) {
        for (var _i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
            var matche = matches_1[_i];
            var regex = new RegExp("(<!\\[CDATA\\[)([\\s\\S]*?)(\\]\\]>)", "g");
            var m = regex.exec(matche);
            if (m) {
                var cdataText = m[2];
                cdataText = cdataText.replace(/\&/g, "&amp;");
                cdataText = cdataText.replace(/\</g, "&lt;");
                cdataText = cdataText.replace(/\>/g, "&gt;");
                cdataText = cdataText.replace(/\"/g, "&quot;");
                rawText = rawText.replace(m[0], cdataText);
            }
        }
    }
    return rawText;
};
