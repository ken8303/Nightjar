import ts from 'typescript';

// This is an inventory of possible interface text, not a translation-coverage
// percentage. Dynamic expressions, generated documents and non-JSX surfaces
// need separate review; product names and scientific labels are false positives.
export function findLiteralCandidates(source,file='component.tsx'){
 const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=[];
 const add=(node,value,kind)=>{
  const text=value.replace(/\s+/g,' ').trim();if(!/[A-Za-z]{3,}/.test(text))return;
  const pos=parsed.getLineAndCharacterOfPosition(node.getStart(parsed));
  found.push({line:pos.line+1,column:pos.character+1,kind,text});
 };
 function visit(node){
  if(ts.isJsxText(node))add(node,node.text,'text');
  else if(ts.isJsxAttribute(node)&&['aria-label','aria-description','placeholder','title','alt'].includes(node.name.getText(parsed))&&node.initializer&&ts.isStringLiteral(node.initializer))add(node.initializer,node.initializer.text,'attribute');
  else if(ts.isJsxExpression(node)&&node.expression&&ts.isStringLiteral(node.expression))add(node.expression,node.expression.text,'text');
  ts.forEachChild(node,visit);
 }
 visit(parsed);return found;
}
