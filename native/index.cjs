const candidates = []

const load = () => {
  for (const candidate of candidates) {
    try {
      const addon = require(candidate)
      console.log(`Loaded native module from ${candidate}`)
      return addon
    } catch (error) {
      console.log(`Failed to load native module from ${candidate}: ${error.message}`)
      // Ignore and try next
    }
  }
  return null
}

module.exports = {
  load,
  candidates,
}
