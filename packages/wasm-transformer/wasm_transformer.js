let wasm;

let cachegetInt32Memory = null;
function getInt32Memory() {
  if (
    cachegetInt32Memory === null ||
    cachegetInt32Memory.buffer !== wasm.memory.buffer
  ) {
    cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
  }
  return cachegetInt32Memory;
}

let cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true
});

let cachegetUint8Memory = null;
function getUint8Memory() {
  if (
    cachegetUint8Memory === null ||
    cachegetUint8Memory.buffer !== wasm.memory.buffer
  ) {
    cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory;
}

function getStringFromWasm(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}
/**
 * get the versioon of the package
 * @returns {string}
 */
export function version() {
  const retptr = 8;
  const ret = wasm.version(retptr);
  const memi32 = getInt32Memory();
  const v0 = getStringFromWasm(
    memi32[retptr / 4 + 0],
    memi32[retptr / 4 + 1]
  ).slice();
  wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
  return v0;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm(arg) {
  const ptr = wasm.__wbindgen_malloc(arg.length * 1);
  getUint8Memory().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

function getArrayU8FromWasm(ptr, len) {
  return getUint8Memory().subarray(ptr / 1, ptr / 1 + len);
}
/**
 * i64 lowering that can be done by the browser
 * @param {Uint8Array} wasm_binary
 * @returns {Uint8Array}
 */
export function lowerI64Imports(wasm_binary) {
  const retptr = 8;
  const ret = wasm.lowerI64Imports(
    retptr,
    passArray8ToWasm(wasm_binary),
    WASM_VECTOR_LEN
  );
  const memi32 = getInt32Memory();
  const v0 = getArrayU8FromWasm(
    memi32[retptr / 4 + 0],
    memi32[retptr / 4 + 1]
  ).slice();
  wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
  return v0;
}

function init(module) {
  if (typeof module === "undefined") {
    module = import.meta.url.replace(/\.js$/, "_bg.wasm");
  }
  let result;
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm(arg0, arg1));
  };

  if (
    (typeof URL === "function" && module instanceof URL) ||
    typeof module === "string" ||
    (typeof Request === "function" && module instanceof Request)
  ) {
    const response = fetch(module);
    if (typeof WebAssembly.instantiateStreaming === "function") {
      result = WebAssembly.instantiateStreaming(response, imports).catch(e => {
        return response
          .then(r => {
            if (r.headers.get("Content-Type") != "application/wasm") {
              console.warn(
                "`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
                e
              );
              return r.arrayBuffer();
            } else {
              throw e;
            }
          })
          .then(bytes => WebAssembly.instantiate(bytes, imports));
      });
    } else {
      result = response
        .then(r => r.arrayBuffer())
        .then(bytes => WebAssembly.instantiate(bytes, imports));
    }
  } else {
    result = WebAssembly.instantiate(module, imports).then(result => {
      if (result instanceof WebAssembly.Instance) {
        return { instance: result, module };
      } else {
        return result;
      }
    });
  }
  return result.then(({ instance, module }) => {
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;

    return wasm;
  });
}

export default init;
