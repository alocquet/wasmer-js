import WasmShell from "../lib/wasm-shell/wasm-shell";
import WasmTTY from "../lib/wasm-tty/wasm-tty";
import { WasmFs } from "@wasmer/wasmfs";

// Need to mock process inside command runner.
jest.mock("../lib/process/process", () => {
  return jest.fn().mockImplementation(() => {
    return { mock: () => {} };
  });
});

const waitForCurrentEventsOnCallStack = () =>
  new Promise(resolve => {
    setTimeout(() => resolve());
  });

describe("WasmShell", () => {
  let wasmShell: WasmShell;
  let wasmTty: WasmTTY;
  let runCommandMock: any;
  let runCommandCompleted: any;
  let wasmFs: WasmFs;

  beforeEach(async () => {
    const xterm = {
      print: jest.fn(() => {}),
      write: jest.fn(() => {})
    };
    // @ts-ignore
    wasmTty = new WasmTTY(xterm);
    wasmFs = new WasmFs();

    wasmShell = new WasmShell(
      // Terminal Config
      {
        fetchCommand: () => Promise.resolve(new Uint8Array()),
        wasmFs
      },
      wasmTty
    );

    runCommandMock = jest.fn(
      () =>
        new Promise(resolve => {
          runCommandCompleted = resolve;
        })
    );

    // @ts-ignore
    wasmShell.getCommandRunner = jest.fn(() => {
      return {
        runCommand: runCommandMock
      };
    });
  });

  it("should prompt, and run commands", async () => {
    wasmShell.prompt();
    await waitForCurrentEventsOnCallStack();

    expect(wasmShell._activePrompt === undefined).toBe(false);

    wasmTty.setInput("cowsay hi");
    wasmShell.handleReadComplete();
    await waitForCurrentEventsOnCallStack();

    expect(wasmShell._activePrompt === undefined).toBe(true);
    expect((wasmShell.getCommandRunner as any).mock.calls.length).toBe(1);
    expect(runCommandMock.mock.calls.length).toBe(1);
  });

  it("should abort prompting", async () => {
    wasmShell.prompt();
    await waitForCurrentEventsOnCallStack();

    expect(wasmShell._activePrompt === undefined).toBe(false);

    (wasmShell as any)._activePrompt.promise
      .then(() => {
        expect(true).toBe(false);
      })
      .catch(() => {
        expect(true).toBe(true);
      });
    wasmShell.abortRead();

    await waitForCurrentEventsOnCallStack();
  });

  it("should be able to move the cursor", async () => {
    // Set the input on tty, set the cursor on tty, then move the cursor from shell
    wasmTty.setInput("cowsay hi");
    wasmTty._cursor = 3;

    wasmShell.handleCursorMove(2);
    expect(wasmTty._cursor).toBe(5);

    wasmShell.handleCursorMove(0);
    expect(wasmTty._cursor).toBe(5);

    wasmShell.handleCursorMove(-2);
    expect(wasmTty._cursor).toBe(3);
  });

  it("should backward and forward delete", async () => {
    wasmTty.setInput("cowsay hi");

    wasmShell.handleCursorMove(100);
    wasmShell.handleCursorErase(true);
    expect(wasmTty.getInput()).toBe("cowsay h");

    wasmShell.handleCursorMove(-100);
    wasmShell.handleCursorErase(false);
    expect(wasmTty.getInput()).toBe("owsay h");

    // Also, check that it wont delete if the cursor is at the beginning or end

    wasmShell.handleCursorErase(true);
    expect(wasmTty.getInput()).toBe("owsay h");

    wasmShell.handleCursorMove(100);
    wasmShell.handleCursorErase(false);
    expect(wasmTty.getInput()).toBe("owsay h");
  });

  it("should insert", async () => {
    wasmTty.setInput("cowsay hi");

    wasmShell.handleCursorMove(100);
    wasmShell.handleCursorInsert("y");
    expect(wasmTty.getInput()).toBe("cowsay hiy");
  });
});
