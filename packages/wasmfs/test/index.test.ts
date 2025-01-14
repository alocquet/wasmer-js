import WasmFs from "../lib/index";

describe("wasmfs", () => {
  let wasmfs: WasmFs;

  beforeEach(async () => {
    wasmfs = new WasmFs();
  });

  it("should have stdin, stdout, and stderr", async () => {
    expect(wasmfs.fs.existsSync("/dev/stdin")).toBe(true);
    expect(wasmfs.fs.existsSync("/dev/stdout")).toBe(true);
    expect(wasmfs.fs.existsSync("/dev/stderr")).toBe(true);
  });

  it("should be able to retrieve stdout", async () => {
    let stdout = "test";
    wasmfs.fs.writeFileSync("/dev/stdout", stdout);

    const response = await wasmfs.getStdOut();
    expect(response).toBe(stdout);
  });
});
