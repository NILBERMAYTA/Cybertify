import { memo } from 'react'
import { motion } from 'framer-motion'

function AnimatedBackgroundComponent() {
  return (
    <>
      <motion.div
        animate={{ x: ['-2%', '2%', '1%', '-2%'], y: ['-1%', '1%', '-2%', '-1%'], scale: [1.02, 1.06, 1.04, 1.02] }}
        className="terminal-aurora"
        transition={{ duration: 18, ease: 'easeInOut', repeat: Infinity }}
      />
      <div className="terminal-grid" />
    </>
  )
}

export const AnimatedBackground = memo(AnimatedBackgroundComponent)
