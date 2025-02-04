/* tslint:disable */
/**
 * get the versioon of the package
 * @returns {string}
 */
export function version(): string;
/**
 * i64 lowering that can be done by the browser
 * @param {Uint8Array} wasm_binary
 * @returns {Uint8Array}
 */
export function lower_i64_imports(wasm_binary: Uint8Array): Uint8Array;
