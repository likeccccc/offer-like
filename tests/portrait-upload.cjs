const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const content = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');
const inject = fs.readFileSync(path.join(__dirname, '../content/inject.js'), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(content.slice(content.indexOf('  function portraitInputLabel('), content.indexOf('  async function uploadSavedPortrait(')), ctx);
vm.runInContext(inject.slice(inject.indexOf('  function setPhotoFile('), inject.indexOf('  window.__OFFERLIKE__ =')), ctx);
const win = {
  HTMLInputElement: class {},
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  File: class { constructor(parts, name, options) { this.size = parts[0].length; this.name = name; this.type = options.type; } },
  DataTransfer: class { constructor() { this.files = []; this.items = { add: file => this.files.push(file) }; } },
  Event: class { constructor(type) { this.type = type; } }
};
win.queueMicrotask = callback => callback();
Object.defineProperty(win.HTMLInputElement.prototype, 'files', {set(files) {this.files = files;}});
function input(name = 'portrait') {
  return { name, id: '', type: 'file', disabled: false, isConnected: true, files: [], labels: [], accept: '',
    getAttribute: () => null, parentElement: null, ownerDocument: { defaultView: win },
    events: [], dispatchEvent(e) { this.events.push(e.type); } };
}
const photo = bytes => ({name: 'portrait.png', type: 'image/png', size: bytes,
  dataUrl: 'data:image/png;base64,' + Buffer.alloc(bytes).toString('base64')});
assert.equal(ctx.portraitInputLabel(input('resume')), '');
assert.equal(ctx.portraitInputLabel(input('passportPhoto')), '');
assert.equal(ctx.portraitInputLabel(input('attachment')), '');
assert.ok(ctx.portraitInputLabel(input('portrait')));
assert.equal(ctx.acceptsPortrait({accept: '.pdf'}, photo(1)), false);
assert.equal(ctx.acceptsPortrait({accept: '.PNG'}, photo(1)), true);
assert.equal(ctx.acceptsPortrait({accept: '.jpg'}, {type: 'image/jpeg'}), true);
const exact = input();
assert.equal(ctx.setPhotoFile(exact, photo(300 * 1024)).ok, true);
assert.equal(exact.files[0].size, 300 * 1024);
assert.deepEqual(exact.events, ['input', 'change']);
assert.equal(ctx.setPhotoFile(exact, photo(1)).code, 'EXISTING_FILE', 'Keep an already selected file');
const tooLarge = input();
assert.equal(ctx.setPhotoFile(tooLarge, {...photo(300 * 1024 + 1), size: 1}).ok, false, 'Validate actual bytes, not only saved metadata');
assert.equal(tooLarge.files.length, 0);
assert.equal(ctx.setPhotoFile(input(), photo(0)).ok, false);
assert.equal(ctx.setPhotoFile(input(), {...photo(1), type: 'image/jpeg'}).ok, false);
vm.runInContext(content.slice(content.indexOf('  function handoffPortraitLocally('), content.indexOf('  async function uploadSavedPortrait(')), ctx);
Object.assign(ctx, win, { atob: win.atob });
const fallback = input();
assert.equal(ctx.handoffPortraitLocally(fallback, photo(300 * 1024)).ok, true);
assert.deepEqual(fallback.events, ['input', 'change']);
assert.equal(ctx.handoffPortraitLocally(input(), {...photo(300 * 1024 + 1), size: 1}).ok, false);
console.log('PASS: 300 KB boundary, oversized/empty/mismatched data rejection, photo-only targeting, format checks, page events');
