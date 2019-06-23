import * as fs from 'fs'
import { WASI } from '../src'
import '../src/webassembly.d'
import { createFsFromVolume, IFs } from 'memfs'
import { Volume } from 'memfs/lib/volume'
import NodeBindings from '../src/bindings/node'

const instantiateWasi = async (
  file: string,
  memfs: IFs,
  args: string[] = [],
  env: { [key: string]: string } = {}
) => {
  let wasi = new WASI({
    preopenDirectories: {},
    env: env,
    args: args,
    bindings: {
      ...NodeBindings,
      fs: memfs
    }
  })
  const buf = fs.readFileSync(file)
  let bytes = new Uint8Array(buf as any).buffer
  let { instance } = await WebAssembly.instantiate(bytes, { wasi_unstable: wasi.exports })
  wasi.setMemory(instance.exports.memory)
  return { wasi, instance }
}

const getStdout = (memfs: IFs) => {
  // console.log(memfs.toJSON("/dev/stdout"))
  let promise = new Promise((resolve, reject) => {
    const rs_out = memfs.createReadStream('/dev/stdout', 'utf8')
    // let prevData = ''
    rs_out.on('data', data => {
      // prevData = prevData + data.toString('utf8')
      resolve(data.toString('utf8'))
    })
  })
  return promise
}

describe('WASI interaction', () => {
  let memfs: IFs
  let vol: Volume
  beforeEach(async () => {
    vol = Volume.fromJSON({
      '/dev/stdin': '',
      '/dev/stdout': '',
      '/dev/stderr': ''
    })
    vol.releasedFds = [0, 1, 2]
    memfs = createFsFromVolume(vol)

    const fd_err = vol.openSync('/dev/stderr', 'w')
    const fd_out = vol.openSync('/dev/stdout', 'w')
    const fd_in = vol.openSync('/dev/stdin', 'w')
    expect(fd_err).toBe(2)
    expect(fd_out).toBe(1)
    expect(fd_in).toBe(0)
  })

  it('Helloworld can be run', async () => {
    let { instance, wasi } = await instantiateWasi('test/rs/helloworld.wasm', memfs)
    instance.exports._start()
    expect(await getStdout(memfs)).toMatchInlineSnapshot(`
                              "Hello world!
                              "
                    `)
  })

  it('WASI args work', async () => {
    let { instance, wasi } = await instantiateWasi('test/rs/args.wasm', memfs, [
      'demo',
      '-h',
      '--help',
      '--',
      'other'
    ])
    instance.exports._start()
    expect(await getStdout(memfs)).toMatchInlineSnapshot(`
                              "[\\"demo\\", \\"-h\\", \\"--help\\", \\"--\\", \\"other\\"]
                              "
                    `)
  })

  it('WASI env work', async () => {
    let { instance, wasi } = await instantiateWasi('test/rs/env.wasm', memfs, [], {
      WASM_EXISTING: 'VALUE'
    })
    instance.exports._start()
    expect(await getStdout(memfs)).toMatchInlineSnapshot(`
      "should be set (WASM_EXISTING): Some(\\"VALUE\\")
      shouldn't be set (WASM_UNEXISTING): None
      Set existing var (WASM_EXISTING): Some(\\"NEW_VALUE\\")
      Set unexisting var (WASM_UNEXISTING): Some(\\"NEW_VALUE\\")
      All vars in env:
      WASM_EXISTING: NEW_VALUE
      WASM_UNEXISTING: NEW_VALUE
      "
    `)
  })
})