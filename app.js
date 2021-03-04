// import esprima from "https://cdn.jsdelivr.net/npm/esprima@4.0.1/dist/esprima.js"
// var esprima = require('esprima');
import { compile } from './src/compiler.js'

import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.12/dist/vue.esm.browser.js'

const { localStorage, esprima, CodeMirror } = window

const STORE_KEY = 'program'

const state = {
  error: false,
  form: {
    ast: false
  }
}

let sourceEditor
let targetEditor
let astEditor

// UI
const transpile = () => {
  // var program = 'const answer = 42';
  const program = sourceEditor.getValue() // 'const answer = 42';

  // Store
  localStorage.setItem(STORE_KEY, program)

  state.error = false

  try {
    const ast = esprima.parseModule(program, {
      comment: true
      // range: true
    })
    //   console.log(ast)
    // Set
    const transpiled = JSON.stringify(ast, null, 2)
    astEditor.setValue(transpiled)

    const c = compile(ast)
    targetEditor.setValue(c)
  } catch (err) {
    console.warn(err)
    // notifyMe(err)
    state.error = true
  }
}

const mounted = () => {
  sourceEditor = CodeMirror.fromTextArea(document.getElementById('source'), {
    lineNumbers: true,
    viewportMargin: Infinity,
    mode: 'javascript'
  })
  sourceEditor.setSize('auto', 'auto')

  targetEditor = CodeMirror.fromTextArea(document.getElementById('target'), {
    lineNumbers: true,
    readOnly: true,
    viewportMargin: Infinity,
    mode: 'text/x-csrc'
  })
  targetEditor.setSize('auto', 'auto')

  astEditor = CodeMirror.fromTextArea(document.getElementById('ast'), {
    lineNumbers: true,
    readOnly: true,
    viewportMargin: Infinity,
    mode: 'javascript'
  })

  // Persist
  const resp = localStorage.getItem(STORE_KEY)
  sourceEditor.setValue(resp)

  // Do initial transpile
  transpile()
}

// Bind
window.transpile = transpile

const vue = new Vue({
  el: '#app',
  data: vm => (state),
  mounted,
  methods: {
    transpile
  }
})
