"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
// const HTML = require('html-parse-stringify2');
const HTML = __importStar(require("html-parse-stringify2"));
const path = __importStar(require("path"));
const sqlFormatter = __importStar(require("sql-formatter"));
const convert_1 = require("./lib/convert");
const replaceCdata_1 = require("./lib/utils/replaceCdata");
const myBatisMapper = {};
class Mybatis {
    createMapper(xmlsDir) {
        try {
            const xmls = fs_1.readdirSync(path.resolve(xmlsDir));
            for (const xml of xmls) {
                const rawText = replaceCdata_1.replaceCdata(fs_1.readFileSync(path.resolve(xmlsDir, xml)).toString());
                const mappers = HTML.parse(rawText);
                try {
                    for (const mapper of mappers) {
                        // Mapping <mapper> tag recursively
                        this.findMapper(mapper);
                    }
                }
                catch (err) {
                    throw new Error("Error occured during parse XML file [" + xml + "]");
                }
            }
        }
        catch (error) {
            throw new Error("Error occured during read mapper dir");
        }
    }
    findMapper(node) {
        const queryTypes = ['sql', 'select', 'insert', 'update', 'delete'];
        if (node.type === 'tag' && node.name === 'mapper') {
            // Add Mapper
            myBatisMapper[node.attrs.namespace] = {};
            for (const sql of node.children) {
                if (sql.type === 'tag' && queryTypes.indexOf(sql.name) > -1) {
                    myBatisMapper[node.attrs.namespace][sql.attrs.id] = sql.children;
                }
            }
            return;
        }
        else {
            // Recursive to next children
            if (node.children != null && node.children.length > 0) {
                for (const nextChildren of node.children) {
                    this.findMapper(nextChildren);
                }
            }
            else {
                return;
            }
        }
    }
    getStatement(namespace, sql, param) {
        let statement = '';
        // Parameter Check
        if (namespace == null) {
            throw new Error('Namespace should not be null.');
        }
        if (myBatisMapper[namespace] === undefined) {
            throw new Error('Namespace [' + namespace + '] not exists.');
        }
        if (sql == null) {
            throw new Error('SQL ID should not be null.');
        }
        if (myBatisMapper[namespace][sql] === undefined) {
            throw new Error('SQL ID [' + sql + '] not exists');
        }
        try {
            for (const children of myBatisMapper[namespace][sql]) {
                // Convert SQL statement recursively
                statement += convert_1.convertChildren(children, param, namespace, myBatisMapper);
            }
            // Check not converted Parameters
            const regexList = ['\\#{\\S*}', '\\${\\S*}'];
            for (const regexString of regexList) {
                const regex = new RegExp(regexString, 'g');
                const checkParam = statement.match(regex);
                if (checkParam != null && checkParam.length > 0) {
                    throw new Error("Parameter " + checkParam.join(",") + " is not converted.");
                }
            }
        }
        catch (err) {
            throw err;
        }
        return sqlFormatter.format(statement);
    }
}
module.exports = new Mybatis();
exports.default = new Mybatis();
