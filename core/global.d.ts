import { Native } from '@core/native'
import { NativeBindingType } from 'types/native/index'
import { NativeConstantsType } from 'types/native/constants'

// Reference pre-initialization globals
import './global-pre.d.ts'

export {}

declare global {
  var native: Native
  var nativeBinding: NativeBindingType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var MemoryUtils: any
  var nativeConstants: NativeConstantsType

  namespace NodeJS {
    interface Process {
      resourcesPath: string
    }
  }
}
