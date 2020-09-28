window.onload = event => {
  document.getElementById('num').addEventListener('input', onInputNumber);
};

const onInputNumber = () => {
  let num = document.getElementById('num').value;

  if (num === '') {
    printNumError('Number is null');
    return;
  }

  let regBin = /^\s*(0b|0B)?([01]+)\s*$/g;
  let regDec = /^(\s*)(\d+)\s*$/g;
  let regHex = /^\s*(0x|0X)?([0-9a-fA-F]+)\s*$/g;

  let raBin = document.getElementById('ra-bin');
  let raDec = document.getElementById('ra-dec');
  let raHex = document.getElementById('ra-hex');
  let raAuto = document.getElementById('ra-auto');

  let formats;
  if (raAuto.checked) {
    formats = [[regDec, 10, ''], [regHex, 16, '0x'], [regBin, 2, '0b']];
  } else if (raBin.checked) {
    formats = [[regBin, 2, '0b']];
  } else if (raDec.checked) {
    formats = [[regDec, 10, '']];
  } else if (raHex.checked) {
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
    printNumError('Invalid number format');
    return;
  }

  num = BigInt(num);
  printNumError('');
  printNumResult(num);
};

const printNumError = (msg) => {
  document.getElementById('sp-num-msg').textContent = msg;
  let cells = document.getElementById('tb-output').getElementsByTagName('td');
  for (let cell of cells)
    cell.textContent = '';
}

const printNumResult = (num) => {
  let bin = num.toString(2);
  let dec = num.toString(10);
  let hex = num.toString(16);

  let values = [bin, dec, hex];
  let prefixes = ['0b', '', '0x'];

  let rows = document.getElementById('tb-output').rows;
  let r = 1;
  for (let zero_padding of [false, true]) {
    for (let use_prefix of [false, true]) {
      for (let upper_case of [false, true]) {
        for (let [i, value] of values.entries()) {
          if (zero_padding) {
            value = '0'.repeat((4 - value.length % 4) % 4) + value;
          }
          if (use_prefix) {
            value = prefixes[i] + value;
          }
          if (upper_case) {
            value = value.toUpperCase();
          }
          rows[r].cells[i].textContent = value;
        }
        ++r;
      }
    }
  }
};
