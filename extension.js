const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

const Me = ExtensionUtils.getCurrentExtension();
let Calculator = Me.imports.calculator.Calculator;

let calculator;

function init () {
}

function enable () {
  Calculator = Me.imports.calculator.Calculator;
  calculator = new Calculator;
  Main.panel.addToStatusArea('pcalc', calculator);
}

function disable () {
  if (calculator) {
    calculator.destroy();
    calculator = null;
  }
}
