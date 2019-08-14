export interface Node {
    type: 'tag' | 'text' | 'component';
    name: string;
    attrs: Record<string, string>;
    voidElement?: boolean;
    content?: string;
    children: Node[];
}

export function parse(html: string, options?: any): Node[];
export function stringify(doc: any): any;
