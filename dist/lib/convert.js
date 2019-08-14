"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line: max-line-length
const convertChildren = (children, param, namespace, myBatisMapper) => {
    if (param == null) {
        param = {};
    }
    if (!isDict(param)) {
        throw new Error("Parameter argument should be Key-Value type or Null.");
    }
    if (children.type === 'text') {
        // Convert Parameters
        return convertParameters(children, param);
    }
    else if (children.type === 'tag') {
        switch (children.name.toLowerCase()) {
            case 'if':
                return convertIf(children, param, namespace, myBatisMapper);
            case 'choose':
                return convertChoose(children, param, namespace, myBatisMapper);
            case 'trim':
            case 'where':
                return convertTrimWhere(children, param, namespace, myBatisMapper);
            case 'set':
                return convertSet(children, param, namespace, myBatisMapper);
            case 'foreach':
                return convertForeach(children, param, namespace, myBatisMapper);
            case 'bind':
                param = convertBind(children, param);
                return '';
            case 'include':
                return convertInclude(children, param, namespace, myBatisMapper);
            default:
                throw new Error("XML is not well-formed character or markup. Consider using CDATA section.");
        }
    }
    else {
        return '';
    }
};
exports.convertChildren = convertChildren;
const convertParameters = (children, param) => {
    let convertString = children.content;
    try {
        convertString = convertParametersInner('#', convertString, param);
        convertString = convertParametersInner('$', convertString, param);
    }
    catch (err) {
        throw new Error("Error occurred during convert parameters.");
    }
    try {
        // convert CDATA string
        convertString = convertString.replace(/(\&amp\;)/g, '&');
        convertString = convertString.replace(/(\&lt\;)/g, '<');
        convertString = convertString.replace(/(\&gt\;)/g, '>');
        convertString = convertString.replace(/(\&quot\;)/g, '"');
    }
    catch (err) {
        throw new Error("Error occurred during convert CDATA section.");
    }
    return convertString;
};
exports.convertParameters = convertParameters;
const convertParametersInner = (change, convertString, param) => {
    const stringReg = new RegExp('(\\' + change + '\\{[a-zA-Z0-9._\\$]+\\})', 'g');
    let stringTarget = convertString.match(stringReg);
    if (stringTarget != null && stringTarget.length > 0) {
        stringTarget = uniqueArray(stringTarget);
        for (const target of stringTarget) {
            const t = target.replace(change + '{', '').replace('}', '');
            let tempParamKey = eval('param.' + t);
            if (tempParamKey !== undefined) {
                const reg = new RegExp('\\' + change + '{' + t + '}', 'g');
                if (tempParamKey === null) {
                    tempParamKey = 'NULL';
                    convertString = convertString.replace(reg, tempParamKey);
                }
                else {
                    if (change === '#') {
                        tempParamKey = tempParamKey.toString().replace(/"/g, '\\\"');
                        tempParamKey = tempParamKey.replace(/'/g, '\\\'');
                        convertString = convertString.replace(reg, "'" + tempParamKey + "'");
                    }
                    else if (change === '$') {
                        convertString = convertString.replace(reg, tempParamKey);
                    }
                }
            }
        }
    }
    return convertString;
};
const convertIf = (children, param, namespace, myBatisMapper) => {
    let evalString = children.attrs.test;
    try {
        // Create Evaluate string
        evalString = replaceEvalString(evalString, param);
        evalString = evalString.replace(/ and /gi, ' && ');
        evalString = evalString.replace(/ or /gi, ' || ');
        // replace == to === for strict evaluate
        evalString = evalString.replace(/==/g, "===");
        evalString = evalString.replace(/!=/g, "!==");
    }
    catch (err) {
        throw new Error("Error occurred during convert <if> element.");
    }
    // Execute Evaluate string
    try {
        if (eval(evalString)) {
            let convertString = '';
            for (const nextChildren of children.children) {
                convertString += convertChildren(nextChildren, param, namespace, myBatisMapper);
            }
            return convertString;
        }
        else {
            return '';
        }
    }
    catch (e) {
        return '';
    }
};
exports.convertIf = convertIf;
// tslint:disable-next-line: max-line-length
const convertForeach = (children, param, namespace, myBatisMapper) => {
    try {
        const collection = eval('param.' + children.attrs.collection);
        const item = children.attrs.item;
        const open = (children.attrs.open == null) ? '' : children.attrs.open;
        const close = (children.attrs.close == null) ? '' : children.attrs.close;
        const separator = (children.attrs.separator == null) ? '' : children.attrs.separator;
        const foreachTexts = [];
        for (const coll of collection) {
            const foreachParam = param;
            foreachParam[item] = coll;
            let foreachText = '';
            for (const nextChildren of children.children) {
                let fText = convertChildren(nextChildren, foreachParam, namespace, myBatisMapper);
                fText = fText.replace(/^\s*$/g, '');
                if (fText != null && fText.length > 0) {
                    foreachText += fText;
                }
            }
            if (foreachText != null && foreachText.length > 0) {
                foreachTexts.push(foreachText);
            }
        }
        return (open + foreachTexts.join(separator) + close);
    }
    catch (err) {
        throw new Error("Error occurred during convert <foreach> element.");
    }
};
exports.convertForeach = convertForeach;
// tslint:disable-next-line: max-line-length
const convertChoose = (children, param, namespace, myBatisMapper) => {
    try {
        for (const whenChildren of children.children) {
            if (whenChildren.type === 'tag' && whenChildren.name.toLowerCase() === 'when') {
                let evalString = whenChildren.attrs.test;
                // Create Evaluate string
                evalString = replaceEvalString(evalString, param);
                evalString = evalString.replace(/ and /gi, ' && ');
                evalString = evalString.replace(/ or /gi, ' || ');
                // replace == to === for strict evaluate
                evalString = evalString.replace(/==/g, "===");
                evalString = evalString.replace(/!=/g, "!==");
                // Execute Evaluate string
                try {
                    if (eval(evalString)) {
                        // If <when> condition is true, do it.
                        let convertString = '';
                        for (const nextChildren of whenChildren.children) {
                            convertString += convertChildren(nextChildren, param, namespace, myBatisMapper);
                        }
                        return convertString;
                    }
                    else {
                        continue;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            else if (whenChildren.type === 'tag' && whenChildren.name.toLowerCase() === 'otherwise') {
                // If reached <otherwise> tag, do it.
                let convertString = '';
                for (const nextChildren of whenChildren.children) {
                    convertString += convertChildren(nextChildren, param, namespace, myBatisMapper);
                }
                return convertString;
            }
        }
        // If there is no suitable when and otherwise, just return null.
        return '';
    }
    catch (err) {
        throw new Error("Error occurred during convert <choose> element.");
    }
};
exports.convertChoose = convertChoose;
// tslint:disable-next-line: max-line-length
const convertTrimWhere = (children, param, namespace, myBatisMapper) => {
    let convertString = '';
    let prefix = null;
    let prefixOverrides = null;
    let globalSet = null;
    try {
        switch (children.name.toLowerCase()) {
            case 'trim':
                prefix = children.attrs.prefix;
                prefixOverrides = children.attrs.prefixOverrides;
                globalSet = 'g';
                break;
            case 'where':
                prefix = 'WHERE';
                prefixOverrides = 'and|or';
                globalSet = 'gi';
                break;
            default:
                throw new Error("Error occurred during convert <trim/where> element.");
        }
        // Convert children first.
        for (const nextChildren of children.children) {
            convertString += convertChildren(nextChildren, param, namespace, myBatisMapper);
        }
        // Remove prefixOverrides
        const trimRegex = new RegExp('(^)([\\s]*?)(' + prefixOverrides + ')', globalSet);
        convertString = convertString.replace(trimRegex, '');
        if (children.name.toLowerCase() !== 'trim') {
            const trimRegex3 = new RegExp('(' + prefixOverrides + ')([\\s]*?)($)', globalSet);
            convertString = convertString.replace(trimRegex3, '');
        }
        // Add Prefix if String is not empty.
        const trimRegex2 = new RegExp('([a-zA-Z])', 'g');
        const w = convertString.match(trimRegex2);
        if (w != null && w.length > 0) {
            convertString = prefix + ' ' + convertString;
        }
        // Remove comma(,) before WHERE
        if (children.name.toLowerCase() !== 'where') {
            const regex = new RegExp('(,)([\\s]*?)(where)', 'gi');
            convertString = convertString.replace(regex, ' WHERE ');
        }
        return convertString;
    }
    catch (err) {
        throw new Error("Error occurred during convert <" + children.name.toLowerCase() + "> element.");
    }
};
exports.convertTrimWhere = convertTrimWhere;
const convertSet = (children, param, namespace, myBatisMapper) => {
    let convertString = '';
    try {
        // Convert children first.
        for (const nextChildren of children.children) {
            convertString += convertChildren(nextChildren, param, namespace, myBatisMapper);
        }
        // Remove comma repeated more than 2.
        let regex = new RegExp('(,)(,|\\s){2,}', 'g');
        convertString = convertString.replace(regex, ',\n');
        // Remove first comma if exists.
        regex = new RegExp('(^)([\\s]*?)(,)', 'g');
        convertString = convertString.replace(regex, '');
        // Remove last comma if exists.
        regex = new RegExp('(,)([\\s]*?)($)', 'g');
        convertString = convertString.replace(regex, '');
        convertString = ' SET ' + convertString;
        return convertString;
    }
    catch (err) {
        throw new Error("Error occurred during convert <set> element.");
    }
};
exports.convertSet = convertSet;
const convertBind = (children, param) => {
    let evalString = children.attrs.value;
    // Create Evaluate string
    evalString = replaceEvalString(evalString, param);
    param[children.attrs.name] = eval(evalString);
    return param;
};
exports.convertBind = convertBind;
// tslint:disable-next-line: max-line-length
const convertInclude = (children, param, namespace, myBatisMapper) => {
    try {
        // Add Properties to param
        for (const nextChildren of children.children) {
            if (nextChildren.type === 'tag' && nextChildren.name === 'property') {
                param[nextChildren.attrs.name] = nextChildren.attrs.value;
            }
        }
    }
    catch (err) {
        throw new Error("Error occurred during read <property> element in <include> element.");
    }
    let statement = '';
    try {
        let refid = convertParametersInner('#', children.attrs.refid, param);
        refid = convertParametersInner('$', refid, param);
        for (const nextChildren of myBatisMapper[namespace][refid]) {
            statement += convertChildren(nextChildren, param, namespace, myBatisMapper);
        }
    }
    catch (err) {
        throw new Error("Error occurred during convert 'refid' attribute in <include> element.");
    }
    return statement;
};
const isDict = (v) => {
    return typeof v === 'object' && v !== null && !(v instanceof Array) && !(v instanceof Date);
};
const replaceEvalString = (evalString, param) => {
    const keys = Object.keys(param);
    for (const key of keys) {
        let replacePrefix = '';
        let replacePostfix = '';
        let paramRegex = null;
        if (isDict(param[key])) {
            replacePrefix = ' param.';
            replacePostfix = '';
            paramRegex = new RegExp('(^|[^a-zA-Z0-9])(' + key + '\\.)([a-zA-Z0-9]+)', 'g');
        }
        else {
            replacePrefix = ' param.';
            replacePostfix = ' ';
            paramRegex = new RegExp('(^|[^a-zA-Z0-9])(' + key + ')($|[^a-zA-Z0-9])', 'g');
        }
        evalString = evalString.replace(paramRegex, ("$1" + replacePrefix + "$2" + replacePostfix + "$3"));
    }
    return evalString;
};
const uniqueArray = (a) => {
    const out = [...new Set(a)];
    return out;
};
