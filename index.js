let numMan = null;
let cmdMan = null;

window.onload = event => {
  numMan = new NumManager();

  cmdMan = new CmdManager(document.getElementById('cmd-man'));

  //let s = '/bin/bash --user_names=abc,1234 --no_diff --key=gdocid select key__,value__ from a.table,b.table envs=dev,dogfood --out_file="a.txt" --silent';
  //console.log(s);
  //let cmd = Cmd.fromString(s);
  //console.log(cmd);
  //console.log(cmd.generate());
  //let json = JSON.parse(JSON.stringify(cmd));
  //let cmd2 = Cmd.fromJsonObj(json);
  //console.log(cmd2);
  //console.log(cmd2.generate());
};

window.onbeforeunload = event => {
  if (numMan) {
    numMan.deinit();
  }
  if (cmdMan) {
    cmdMan.deinit();
  }
};

//==================================== util ==================================//

const adjustInputWidth = (input, minSize = 8) => {
  let lo = input.value.replaceAll(/[A-Z]/g, '').length;
  let hi = input.value.length - lo;
  input.size = Math.max(minSize, lo + hi * 1.5 + 3);
};

//=============================== number converter ===========================//

class NumManager {
  constructor() {
    let json = JSON.parse(window.localStorage.getItem('num-man') ?? '{}');

    this.input = document.getElementById('num');
    this.input.addEventListener('input', this.onInputNumber.bind(this));
    this.input.value = json.inputValue ?? '0';

    this.raBin = document.getElementById('ra-bin');
    this.raBin.addEventListener('change', this.onInputNumber.bind(this));
    this.raDec = document.getElementById('ra-dec');
    this.raDec.addEventListener('change', this.onInputNumber.bind(this));
    this.raHex = document.getElementById('ra-hex');
    this.raHex.addEventListener('change', this.onInputNumber.bind(this));
    this.raAuto = document.getElementById('ra-auto');
    this.raAuto.addEventListener('change', this.onInputNumber.bind(this));

    this.cbAddPrefix = document.getElementById('cb-add-prefix');
    this.cbAddPrefix.checked = json.addPrefix ?? false;
    this.cbAddPrefix.addEventListener('change', this.onInputNumber.bind(this));

    this.cbUseUpper = document.getElementById('cb-use-upper');
    this.cbUseUpper.checked = json.useUpper ?? false;
    this.cbUseUpper.addEventListener('change', this.onInputNumber.bind(this));

    this.cbFillZero = document.getElementById('cb-fill-zero');
    this.cbFillZero.checked = json.fillZero ?? false;
    this.cbFillZero.addEventListener('change', this.onInputNumber.bind(this));

    this.cbFillZero16 = document.getElementById('cb-fill-zero-16');
    this.cbFillZero16.checked =json.cbFillZero16 ?? false;
    this.cbFillZero16.addEventListener('change', this.onInputNumber.bind(this));

    this.onInputNumber();
  }

  deinit() {
    window.localStorage.setItem('num-man', JSON.stringify({
      inputValue: this.input.value,
      addPrefix: this.cbAddPrefix.checked,
      useUpper: this.cbUseUpper.checked,
      fillZero: this.cbFillZero.checked,
      fillZero16: this.cbFillZero16.checked,
    }));
  }

  onInputNumber() {
    let input = document.getElementById('num');
    adjustInputWidth(input, 40);
    let num = input.value;
    if (!num) {
      this.printNumError('Number is null');
      return;
    }

    let regBin = /^\s*(0b|0B)?([01]+)\s*$/g;
    let regDec = /^(\s*)(\d+)\s*$/g;
    let regHex = /^\s*(0x|0X)?([0-9a-fA-F]+)\s*$/g;

    let formats;
    if (this.raAuto.checked) {
      formats = [[regDec, 10, ''], [regHex, 16, '0x'], [regBin, 2, '0b']];
    } else if (this.raBin.checked) {
      formats = [[regBin, 2, '0b']];
    } else if (this.raDec.checked) {
      formats = [[regDec, 10, '']];
    } else if (this.raHex.checked) {
      formats = [[regHex, 16, '0x']];
    }

    let radix = -1;
    for (let [i, [reg, rad, prefix]] of formats.entries()) {
      let res = reg.exec(num);
      if (res != null && res[2] != null) {
        num = prefix + res[2];
        radix = rad;
        break;
      }
    }
    if (radix == -1) {
      this.printNumError('Invalid number format');
      return;
    }

    num = BigInt(num);
    this.printNumError('');
    this.printNumResult(num);
  };

  printNumError(msg) {
    document.getElementById('sp-num-msg').textContent = msg;
    let cells = document.getElementById('tb-output').getElementsByTagName('td');
    for (let cell of cells)
      cell.textContent = '';
  }

  printNumResult(num) {
    let bin = num.toString(2);
    let dec = num.toString(10);
    let hex = num.toString(16);

    let values = [bin, dec, hex];
    let prefixes = ['0b', '', '0x'];

    let row = document.getElementById('tb-output').rows[1];

    for (let [i, value] of values.entries()) {
      if (this.cbFillZero16.checked && value.length < 16) {
        value = '0'.repeat(16 - value.length) + value;
      } else if (this.cbFillZero.checked) {
        value = '0'.repeat((4 - value.length % 4) % 4) + value;
      }
      if (this.cbAddPrefix.checked) {
        value = prefixes[i] + value;
      }
      if (this.cbUseUpper.checked) {
        value = value.toUpperCase();
      }
      row.cells[i].textContent = value;
    }
  }
}

//=================================== CMD manager ==============================//

class Option {
  constructor(value, checked) {
    this.value = value;
    this.checked = checked;
  }

  toJSON() {
    return {
      value: this.value,
      checked: this.checked,
    };
  }

  init(arg, div) {
    this.arg = arg;

    if (this.div && this.div != div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
    }
    div.innerHTML = '';
    this.div = div;

    this.box = document.createElement('input');
    this.box.type = 'checkbox';
    this.box.checked = this.checked;
    this.box.addEventListener('change', (event) => {
      this.checked = this.box.checked;
      let values = this.arg.input.value.split(this.arg.separator).filter(s => s.length > 0);
      if (this.checked) {
        if (values.indexOf(this.value) == -1) {
          values = [this.value].concat(values);
        }
      } else {
        values = values.filter(s => s != this.value);
      }
      this.arg.input.value = values.join(this.arg.separator);
      adjustInputWidth(this.arg.input);
    });
    let span = document.createElement('span');
    span.innerHTML = this.value + ' ';
    span.addEventListener('click', (event) => {
      this.box.checked = !this.box.checked;
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", false, true);
      this.box.dispatchEvent(evt);
    });
    let deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = 'X';
    deleteBtn.addEventListener('click', (event) => {
      div.parentNode.removeChild(div);
      this.arg.onDeleteOption(this);
    });

    div.appendChild(this.box);
    div.appendChild(span);
    div.appendChild(deleteBtn);
  }

  static fromJsonObj(obj) {
    return new Option(obj.value, obj.checked);
  }
}

// Arg with multiple values chosen from a set (e.g. --source=disk,mem,ssd).
class Arg {
  // prefix: '--prefix=' or ''.
  constructor(prefix, options, enabled = true, separator = ',') {
    this.prefix = prefix;
    this.options = options;
    this.enabled= enabled;
    this.separator = separator;
  }

  toJSON() {
    return {
      prefix: this.prefix,
      options: this.options,
      enabled: this.enabled,
      separator: this.separator,
    };
  }

  static fromJsonObj(obj) {
    let res = new Arg(obj.prefix, [], obj.enabled, obj.separator);
    if (obj.options) {
      for (let option of obj.options)
        res.options.push(Option.fromJsonObj(option));
    }
    return res;
  }

  init(cmd, span, sharedEditDiv) {
    this.cmd = cmd;

    if (this.span && this.span != span && this.span.parentNode) {
      this.span.parentNode.removeChild(this.span);
    }
    span.innerHTML = '';
    this.span = span;

    this.sharedEditDiv = sharedEditDiv;

    // Draw a label for prefix and an input field for value.
    let label = document.createElement('span');
    label.innerHTML = ' ' + this.prefix;
    if (!this.enabled) {
      label.style = 'color: grey';
    }
    label.addEventListener('click', (event) => {
      this.enabled = !this.enabled;
      if (this.enabled)
        label.style = '';
      else
        label.style = 'color: grey';
    });
    span.appendChild(label);

    this.input = document.createElement('input');
    this.input.value = this.generateValues();
    adjustInputWidth(this.input);
    if (this.separator == ' ') {
      this.input.placeholder = 'Plain flags';
    }
    this.input.addEventListener('focus', (event) => {
      if (!this.editArea.parentNode) {
        sharedEditDiv.innerHTML = '';
        sharedEditDiv.appendChild(this.editArea);
      }

      adjustInputWidth(this.input);
      let offset = this.input.getBoundingClientRect();
      this.editArea.style.marginLeft = offset.left;
    });
    this.input.addEventListener('keyup', (event) => {
      adjustInputWidth(this.input);
    });
    span.appendChild(this.input);

    // Draw options and a "Delete" button in sharedEditDiv.
    this.editArea = document.createElement('div');
    for (let option of this.options) {
      let optionDiv = document.createElement('div');
      option.init(this, optionDiv);
      this.editArea.appendChild(optionDiv);
    }

    if (this != this.cmd.flagArg) {
      let deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = 'Delete';
      deleteBtn.addEventListener('click', (event) => {
        span.parentNode.removeChild(span);
        if (sharedEditDiv.firstChild == this.editArea) {
          sharedEditDiv.innerHTML = '';
        }
        this.cmd.onDeleteArg(this);
      });
      this.editArea.appendChild(deleteBtn);
    }
  }

  onDeleteOption(option) {
    let idx = this.options.indexOf(option);
    console.assert(idx != -1, 'Did not find option', option);
    this.options.splice(idx, 1);
  }

  generateValues() {
    let values = [];
    for (let option of this.options) {
      if (option.checked)
        values.push(option.value);
    }
    return values.join(this.separator);
  }

  generate() {
    console.assert(this.prefix || this.options, "Empty arg");

    // Update options based on input field value.
    let values = this.input.value.split(this.separator).filter(s => s.length > 0);
    for (let value of values) {
      let exist = false;
      for (let option of this.options) {
        if (option.value == value) {
          console.assert(!exist, 'Duplicate option', option);
          exist = true;
          option.checked = true;
          option.box.checked = true;
        }
      }
      if (!exist) {
        let option = new Option(value, true);
        this.options.push(option);
        let optionDiv = document.createElement('div');
        option.init(this, optionDiv);
        if (this.editArea.children.length == 0 || this.editArea.lastChild.nodeName != 'BUTTON') {
          this.editArea.appendChild(optionDiv);
        } else {
          this.editArea.insertBefore(optionDiv, this.editArea.lastChild);
        }
      }
    }

    return this.prefix + this.generateValues();
  }

  // Creates CmdArg from a string like "--envs=dev,dogfood,prod".
  static fromString(s) {
    console.assert(s, 'Null string');

    let prefix = '';
    let suffix = s;
    let idx = s.indexOf('=');
    if (idx != -1) {
      prefix = s.substr(0, idx + 1);
      suffix = s.substr(idx + 1);
    }
    let values = suffix.split(',').filter(s => s.length > 0);
    let res = new Arg(prefix, [], true, ',');

    for (const val of values) {
      res.options.push(new Option(val, true));
    }
    return res;
  }
}

// A group of Cmds with the same exe.
class Cmd {
  // exe: /bin/xxx
  // orderedArgs: args like deploy/select/where.
  // unorderedArgs: args like --envs=dev,dogfood,prod.
  // flagArg: an arg with options like --set_log/--no_diff.
  constructor(exe, orderedArgs, unorderedArgs, flagArg) {
    this.exe = exe;
    this.orderedArgs = orderedArgs;
    this.unorderedArgs = unorderedArgs;
    this.flagArg = flagArg;
  }

  toJSON() {
    return {
      exe: this.exe,
      orderedArgs: this.orderedArgs,
      unorderedArgs: this.unorderedArgs,
      flagArg : this.flagArg,
    };
  }

  static fromJsonObj(obj) {
    let res = new Cmd(obj.exe, [], [], Arg.fromJsonObj(obj.flagArg));
    for (let arg of obj.orderedArgs)
      res.orderedArgs.push(Arg.fromJsonObj(arg));
    for (let arg of obj.unorderedArgs)
      res.unorderedArgs.push(Arg.fromJsonObj(arg));
    return res;
  }

  init(man, div) {
    this.man = man;

    if (this.div && this.div != div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
    }
    div.innerHTML = '';
    this.div = div;

    // Draw a delete button.
    let deleteBtn = document.createElement('button');
    deleteBtn.addEventListener('click', (event) => {
      this.div.parentNode.removeChild(this.div);
      this.man.onDeleteCmd(this);
    });
    deleteBtn.innerHTML = 'X';
    div.appendChild(deleteBtn);

    // Draw exe.
    let exe = document.createElement('span');
    exe.innerHTML = this.exe;
    div.appendChild(exe);

    // Reserve an editing div.
    let editDiv = document.createElement('div');

    // Draw args.
    for (let arg of this.orderedArgs) {
      let span = document.createElement('span');
      arg.init(this, span, editDiv);
      div.appendChild(span);
    }
    for (let arg of this.unorderedArgs) {
      let span = document.createElement('span');
      arg.init(this, span, editDiv);
      div.appendChild(span);
    }
    let span = document.createElement('span');
    this.flagArg.init(this, span, editDiv);
    div.appendChild(span);

    // Draw 'Generate' button.
    let gen = document.createElement('button');
    gen.innerHTML = 'Generate';
    gen.addEventListener('click', (event) => {
      let cmdStr = this.generate();
      let output = this.man.input;
      output.innerHTML = cmdStr;
      output.select();
      document.execCommand('copy');
    });
    div.appendChild(document.createTextNode(' '));
    div.appendChild(gen);

    // Append the editing div.
    div.appendChild(editDiv);
    div.appendChild(document.createElement('br'));
  }

  onDeleteArg(arg) {
    let idx = this.orderedArgs.indexOf(arg);
    if (idx != -1) {
      this.orderedArgs.splice(idx, 1);
      return;
    }
    idx = this.unorderedArgs.indexOf(arg);
    if (idx != -1) {
      this.unorderedArgs.splice(idx, 1);
      return;
    }
    console.error('Did not find arg', arg);
  }

  // Tries to merge with another Cmd. Returns if succeeded.
  merge(cmd) {
    if (cmd.exe != this.exe)
      return false;
  }

  generate() {
    let res = [this.exe];
    for (const arg of this.orderedArgs)
      if (arg.enabled)
        res.push(arg.generate());
    for (const arg of this.unorderedArgs)
      if (arg.enabled)
        res.push(arg.generate());
    res.push(this.flagArg.generate());
    return res.join(' ');
  }

  static fromString(s) {
    console.assert(s, 'input string is null');

    let tokens = s.split(/\s/).filter(s => s.length > 0);
    if (tokens.length == 0)
      return null;

    let res = new Cmd(tokens[0], [], [], new Arg('', /* options */[], /* enabled */true, /* separator */' '));
    for (let i = 1; i < tokens.length; ++i) {
      let token = tokens[i];

      if (token === '--')
        continue;

      if (token.substr(0, 2) == '--') {
        if (token.indexOf('=') == -1)
          res.flagArg.options.push(new Option(token, /* checked */true));
        else
          res.unorderedArgs.push(Arg.fromString(token));
      } else {
        res.orderedArgs.push(Arg.fromString(token));
      }
    }
    return res;
  }
}

class CmdManager {
  constructor(div) {
    this.cmds = [];
    let cmdJsons = JSON.parse(window.localStorage.getItem('cmd-man') ?? '{}');
    if (cmdJsons instanceof Array) {
      for (let cmdJson of cmdJsons) {
        this.cmds.push(Cmd.fromJsonObj(cmdJson));
      }
    }
    this.init(div);
  }

  init(div) {
    if (this.div && this.div != div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
    }
    div.innerHTML = '';
    this.div = div;

    // Draw all cmds.
    for (let cmd of this.cmds) {
      let subdiv = document.createElement('div');
      this.div.appendChild(subdiv);
      cmd.init(this, subdiv);
    }

    // Draw an input field.
    this.input = document.createElement('textarea');
    this.input.placeholder = 'Input a new cmd';
    this.input.rows = 4;
    this.input.cols = 120;
    this.input.addEventListener('keyup', (event) => {
      if (event.keyCode == 13)
        this.onCreateCmd();
    });
    this.div.appendChild(document.createElement('br'));
    this.div.appendChild(this.input);
  }

  deinit() {
    window.localStorage.setItem('cmd-man', JSON.stringify(this.cmds));
  }

  onCreateCmd() {
    let s = this.input.value;
    this.input.value = '';

    let cmd = Cmd.fromString(s);
    if (!cmd) {
      this.input.value = 'This cmd is invalid';
      return;
    }

    for (let c of this.cmds) {
      if (c.merge(cmd))
        return;
    }
    this.cmds.push(cmd);
    let subdiv = document.createElement('div');
    this.div.insertBefore(subdiv, this.input);
    cmd.init(this, subdiv);
  }

  onDeleteCmd(cmd) {
    let idx = this.cmds.indexOf(cmd);
    console.assert(idx != -1, 'Did not find cmd', cmd);
    this.cmds.splice(idx, 1);
  }
}
