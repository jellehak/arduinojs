const CompileOptions = {

}

export const createLookup = (arr = [], key = 'name') => {
  const lookupTable = {}
  arr
    .filter(elem => elem) // Only set items
    .forEach(elem => {
      const uid = elem[key]
      lookupTable[uid] = elem
    })
  return lookupTable
}

export class IntermediateVariableTarget {
  constructor (id) {
    this.id = id
    this.type = 'IntermediateVariableTarget'
  }
}

export class PredefinedVariableTarget {
  constructor (id) {
    this.id = id
    this.type = 'PredefinedVariableTarget'
  }
}

class Scope {
  constructor (name = '', parent = null) {
    this.name = name
    this.variables = []
    this.functions = []
    this.returns = []
    this.parent = parent
  }

  get lookup () {
    const withName = this.variables.map(elem => {
      return {
        ...elem,
        name: (elem.id && elem.id.name) || elem.left.name
      }
    })
    return createLookup(withName)
  }

  get functionsLookup () {
    const withName = this.function.map(elem => {
      return {
        ...elem,
        name: (elem.id && elem.id.name) || elem.left.name
      }
    })
    return createLookup(withName)
  }
}

class Variable {
  constructor (options = {}) {
    Object.assign(this, options)
  }
}

function unimplemented (message = '') {
  if (!message) {
    throw Error(`[unimplemented] message is required`)
  }

  return function (node, state) {
    // throw Error(`unimplemented ${node}`)
    console.warn('unimplemented', message, node)
    return `// unimplemented ${message}`
  }
}

// ====
// Compiler Utils
// ====
function joinNodeOutput (srcList = []) {
  return srcList.join('\n')
}

function mapCompile (nodes = [], state) {
  return joinNodeOutput(nodes.map(n => compile(n, state)))
}

const getTypeFromInitNode = (node) => {
  if (node.type === 'BinaryExpression') return 'boolean'

  return typeof (node.value)
}

// used by any node that evaluates to a value to assign that value to the target
export function assignToTarget (cExpression = '', target = {}) {
  switch (target.type) {
    case 'SideEffectTarget':
      return `${cExpression};`
    case IntermediateVariableTarget.type:
      return `JsValue* ${target.id} = (${cExpression});`
    case PredefinedVariableTarget.type:
      return `${target.id} = (${cExpression});`
    case 'ReturnTarget':
      return `return (${cExpression});`
  }
}

export function createComment (node, state) {
  return `/* ${node.value} */`
}

const createArguments = (args = []) => {
  return args.map(elem => elem.name || elem.raw).join(',')
}

export const createParams = (args = []) => {
  return args.map(elem => elem.name || elem.raw).join(',')
}

const detectReturnType = (scope, parent) => {
  if (!scope.returns.length) {
    return 'void'
  }

  // Get type from "VariableDeclarator"
  const _return = scope.returns[0].argument
  const name = _return.name

  // Local scope -or- parent scope
  const _node = scope.lookup[name] || parent.lookup[name]
  if (!_node) {
    console.warn('function scope', scope.lookup, 'parent scope', parent.lookup)
    throw new Error(`Return type couldn't be guessed for variabele "${name}"`)
  }
  console.log('Found', _node)

  const type = getTypeFromInitNode(_node.init)
  console.log(type)

  // Js type to C type
  return TYPE_MAP[type]
}

// ====
// Compilers
// ===
function compileLiteral (node, state) {
  return node.raw
}

function compileProgram (node, state) {
  const body = joinNodeOutput(
    node.body.map(n => compile(n, state))
  )
  return `// Your program
${body}
  `
}

function compileVariableDeclaration (node, state) {
  // TODO check proper 'kind'
  return mapCompile(node.declarations, state)
}

// Js to C type
const TYPE_MAP = {
  boolean: 'bool',
  number: 'int',
  string: 'static const char *',
  object: 'enum' // TODO
}

function compileVariableDeclarator (node = { type: '', id: {}, init: {} }, state) {
  const initType = node.init.type

  if (initType === 'NewExpression') {
    return `${compile(node.init)} ${compile(node.id)};\n`
  }

  if (initType === 'ObjectExpression') {
    // TODO For now a enum?
    return `enum ${compile(node.init)} ${compile(node.id)};\n`
  }

  if (initType === 'Literal' ||
    initType === 'BinaryExpression' ||
    initType === 'CallExpression' ||
    initType === 'Identifier') {
    // Push to scope
    state.variables.push(new Variable(node))

    const type = getTypeFromInitNode(node.init)
    const _type = TYPE_MAP[type] || `// **unknown type: ${type}**`
    return `${_type} ${compile(node.id)} = ${compile(node.init)};`
  }

  console.warn(node)
  console.warn(node.init)
  throw new Error(`Unknown initType: ${initType}`)
}

function compileFunctionDeclaration (node, state) {
  const { id, body, params } = node

  // Create new Function Scope
  const scope = new Scope(id.name, state)
  const _body = compile(body, scope)

  // Find ReturnStatement type

  const returnType = detectReturnType(scope, state)

  // Push to Scope
  state.functions.push(node)

  return `\n${returnType} ${id.name}(${params.map(compile)}) { \n${_body} \n}`
}

const compileExpressionStatement = (node, state) => compile(node.expression, state)

function compileCallExpression (node, state) {
  return `${compile(node.callee)}(${createArguments(node.arguments)});`
}

function compileBlockStatement (node, state) {
  const depth = '  '
  return joinNodeOutput(
    node.body
      .map(n => `${depth}${compile(n, state)}`)
  )
}

function compileReturnStatement (node, state) {
  // Track return statements
  state.returns.push(node)
  return `return${node.argument ? ` ${compile(node.argument, state)}` : ''};`
}

function compileAssignmentPattern (node, state) {
  const type = typeof (node.right.value)

  return `${TYPE_MAP[type]} ${node.left.name}`
}

export function compileBinaryExpression (node, state) {
  return `${compile(node.left, state)} ${node.operator} ${compile(node.right, state)}`
}

function compileIdentifier (node, state) {
  return node.name
}

function compileAssignmentExpression (node, state) {
  // state.variables.push(new Variable(node))

  return `${compile(node.left)} ${node.operator} ${compile(node.right)};`
}

function compileObjectExpression (node, state) {
  // TODO
  // For now render as enum

  return `
{
   ${node.properties.map(n => compile(n, state)).join(',')}
}`
}

function compileProperty (node, state) {
  return `${compile(node.key)}`
}

function compileMemberExpression (node, state) {
  // console.log(node)
  return `${compile(node.object)}.${compile(node.property)}`
}

function compileImportDeclaration (node, state) {
  // console.log(node)
  return `#include ${compile(node.source)}`
}

function compileNewExpression (node, state) {
  // console.log(node)
  return `${compile(node.callee)}`
}

function compileIfStatement (node, state) {
  const alternateSrc = node.alternate
    ? ` else {
          ${compile(node.alternate, state)}
        }`
    : ''

  return `if (${compile(node.test)}) { 
    ${compile(node.consequent)}
  } ${alternateSrc}`
}

function compileSwitchStatement (node, state) {
  console.log(node)
  console.warn('TODO')
}

function getCompilers () {
  return {
    // ArrayExpression: compileArrayExpression,
    AssignmentExpression: compileAssignmentExpression,
    BinaryExpression: compileBinaryExpression,
    BlockStatement: compileBlockStatement,
    // BreakStatement: always('break;\n'),
    CallExpression: compileCallExpression,
    // ConditionalExpression: compileConditionalExpression,
    // ContinueStatement: always('continue;\n'),
    // DebuggerStatement: unimplemented('DebuggerStatement'),
    // DoWhileStatement: unimplemented('DoWhileStatement'),
    // EmptyStatement: always('/* empty statement */'),
    ExpressionStatement: compileExpressionStatement,
    // ForInStatement: compileForInStatement,
    // ForStatement: compileForStatement,
    FunctionDeclaration: compileFunctionDeclaration,
    // FunctionExpression: compileFunctionExpression,
    Identifier: compileIdentifier,
    IfStatement: compileIfStatement,
    // LabeledStatement: unimplemented('LabeledStatement'),
    Literal: compileLiteral,
    // LogicalExpression: compileLogicalExpression,
    MemberExpression: compileMemberExpression,
    // MethodDefinition: unimplemented('MethodDefinition'),
    NewExpression: compileNewExpression,
    ObjectExpression: compileObjectExpression,
    Program: compileProgram,
    ReturnStatement: compileReturnStatement,
    // SequenceExpression: unimplemented('SequenceExpression'),
    SwitchStatement: compileSwitchStatement,
    // ThisExpression: compileThisExpression,
    // ThrowStatement: compileThrowStatement,
    // TryStatement: compileTryStatement,
    // UnaryExpression: compileUnaryExpression,
    // UpdateExpression: compileUpdateExpression,
    VariableDeclaration: compileVariableDeclaration,
    VariableDeclarator: compileVariableDeclarator,
    // WhileStatement: compileWhileStatement,

    // Sub-expressions
    CatchClause: unimplemented('CatchClause'), // NOTE: handled in TryStatement
    SwitchCase: unimplemented('SwitchCase'), // NOTE: handled in SwitchStatement
    Property: compileProperty, // unimplemented('Property'),

    // Leaving out - strict mode
    // WithStatement: notInStrictMode('WithStatement'),

    // ES6+
    ArrayPattern: unimplemented('ArrayPattern'),
    ArrowFunctionExpression: unimplemented('ArrowFunctionExpression'),
    AssignmentPattern: compileAssignmentPattern, // unimplemented('AssignmentPattern'),
    AwaitExpression: unimplemented('AwaitExpression'),
    ClassBody: unimplemented('ClassBody'),
    ClassDeclaration: unimplemented('ClassDeclaration'),
    ClassExpression: unimplemented('ClassExpression'),
    ExportAllDeclaration: unimplemented('ExportAllDeclaration'),
    ExportDefaultDeclaration: unimplemented('ExportDefaultDeclaration'),
    ExportNamedDeclaration: unimplemented('ExportNamedDeclaration'),
    ExportSpecifier: unimplemented('ExportSpecifier'),
    ForOfStatement: unimplemented('ForOfStatement'),
    Import: unimplemented('Import'),
    ImportDeclaration: compileImportDeclaration, // unimplemented('ImportDeclaration'),
    ImportDefaultSpecifier: unimplemented('ImportDefaultSpecifier'),
    ImportNamespaceSpecifier: unimplemented('ImportNamespaceSpecifier'),
    ImportSpecifier: unimplemented('ImportSpecifier'),
    MetaProperty: unimplemented('MetaProperty'),
    ObjectPattern: unimplemented('ObjectPattern'),
    RestElement: unimplemented('RestElement'),
    SpreadElement: unimplemented('SpreadElement'),
    Super: unimplemented('Super'),
    TaggedTemplateExpression: unimplemented('TaggedTemplateExpression'),
    TemplateElement: unimplemented('TemplateElement'),
    TemplateLiteral: unimplemented('TemplateLiteral'),
    YieldExpression: unimplemented('YieldExpression')
  }
}

const lookup = getCompilers()

export function compile (node = {}, state = new Scope(CompileOptions)) {
  if (!node) {
    throw new Error('node is required')
  }

  if (!node.type) {
    console.warn('node', node)
    throw new Error('node type is missing')
  }

  // console.log(node.type, node)

  // if (!state) {
  //   throw new Error('state/scope is missing')
  // }

  const compiler = lookup[node.type] || unimplemented(`Unknown type: ${node.type}`)
  return compiler(node, state)
}
