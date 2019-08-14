import { readdirSync, readFileSync } from 'fs';
// const HTML = require('html-parse-stringify2');
import * as HTML from 'html-parse-stringify2';
import * as path from 'path';
import * as sqlFormatter from 'sql-formatter';
import { convertChildren } from './lib/convert';
import { replaceCdata } from './lib/utils/replaceCdata';

export interface IMybatisMapper {
    [keyof: string]: IMapper;
}
interface IMapper {
    [keyof: string]: HTML.Node[];
}
const myBatisMapper: IMybatisMapper = {};

class Mybatis {
    public createMapper(xmlsDir: string) {
        try {
            const xmls = readdirSync(path.resolve(xmlsDir));
            for (const xml of xmls) {
                const rawText = replaceCdata(readFileSync(path.resolve(xmlsDir, xml)).toString());
                const mappers = HTML.parse(rawText);
                try {
                    for (const mapper of mappers) {
                      // Mapping <mapper> tag recursively
                      this.findMapper(mapper);
                    }
                  } catch (err) {
                    throw new Error("Error occured during parse XML file [" + xml + "]");
                  }
            }
        } catch (error) {
            throw new Error("Error occured during read mapper dir");
        }
    }
    private findMapper(node: HTML.Node) {
        const queryTypes = [ 'sql', 'select', 'insert', 'update', 'delete' ];
        if (node.type === 'tag' && node.name === 'mapper') {
            // Add Mapper
            myBatisMapper[node.attrs.namespace] = {};

            for (const sql of node.children) {
              if (sql.type === 'tag' && queryTypes.indexOf(sql.name) > -1) {
                myBatisMapper[node.attrs.namespace][sql.attrs.id] = sql.children;
              }
            }
            return;
          } else {
            // Recursive to next children
            if (node.children != null && node.children.length > 0) {
              for (const nextChildren of node.children) {
                this.findMapper(nextChildren);
              }
            } else {
              return;
            }
          }
    }
    private getStatement(namespace: string, sql: string, param: Record<string, any>): string {
        let statement = '';

        // Parameter Check
        if (namespace == null) { throw new Error('Namespace should not be null.'); }
        if (myBatisMapper[namespace] === undefined) { throw new Error('Namespace [' + namespace + '] not exists.'); }
        if (sql == null) { throw new Error('SQL ID should not be null.'); }
        if (myBatisMapper[namespace][sql] === undefined) { throw new Error('SQL ID [' + sql + '] not exists'); }
        try {
            for (const children of myBatisMapper[namespace][sql]) {
              // Convert SQL statement recursively
              statement += convertChildren(children, param, namespace, myBatisMapper);
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
          } catch (err) {
            throw err;
          }
        return sqlFormatter.format(statement);
    }
}
module.exports = new Mybatis();
export default new Mybatis();
