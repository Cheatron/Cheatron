import { NativeConstantsType } from 'types/native/constants'
import { Process } from '@core/process'
import { Capstone } from './capstone'

class NativeProcess {
  public current: Process

  constructor(process: Process) {
    this.current = process
  }

  public open(pid: number): Process {
    const ref = nativeBinding.process.open(pid)
    return new Process(ref, pid)
  }
}

class NativeCapstone {
  public open(arch: number, mode: number): Capstone {
    const ref = nativeBinding.cs.open(arch, mode)
    return new Capstone(ref, arch, mode)
  }
}

export class Native {
  public process: NativeProcess
  public capstone: NativeCapstone
  public version: string
  public constants: NativeConstantsType

  constructor() {
    this.constants = nativeBinding.getConstants()
    this.version = nativeBinding.getVersion()

    nativeBinding.initialize((level: string, message: string) => {
      const l = level.toLowerCase()
      if (l === 'debug') logger.debug('Native', message)
      else if (l === 'warn') logger.warn('Native', message)
      else if (l === 'error') logger.error('Native', message)
      else logger.info('Native', message)
    })

    const currentRef = nativeBinding.process.getCurrent()

    const current = new Process(currentRef, process.pid)
    this.process = new NativeProcess(current)
    this.capstone = new NativeCapstone()
  }
}

export const native = new Native()
