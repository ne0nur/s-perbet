import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const achievementsDir = path.resolve('public/achievements')

if (!fs.existsSync(achievementsDir)) {
  console.error('❌ Achievements directory does not exist.')
  process.exit(1)
}

const files = fs.readdirSync(achievementsDir)
const svgFiles = files.filter(f => f.endsWith('.svg'))

console.log(`🔍 Found ${svgFiles.length} SVG achievements to convert...`)

svgFiles.forEach(file => {
  const baseName = path.basename(file, '.svg')
  const svgPath = path.join(achievementsDir, file)
  const pngPath = path.join(achievementsDir, `${baseName}.png`)

  console.log(`🔄 Converting ${file} to PNG (128x128, black background)...`)
  try {
    // ImageMagick: set background to black, flatten alpha, resize to 128x128
    execSync(`convert -background black -alpha remove -alpha off -resize 128x128! "${svgPath}" "${pngPath}"`)
    
    // Delete the original SVG
    fs.unlinkSync(svgPath)
  } catch (err) {
    console.error(`❌ Error converting ${file}:`, err.message)
  }
})

// Also cleanup the temporary JPEG files we copied earlier
const jpegFiles = files.filter(f => f.endsWith('.jpg'))
jpegFiles.forEach(file => {
  const filePath = path.join(achievementsDir, file)
  try {
    fs.unlinkSync(filePath)
    console.log(`🧹 Deleted old JPEG file: ${file}`)
  } catch (e) {}
})

console.log('✅ Conversion complete! All achievements are now 128x128 PNGs with a black background, and old SVGs/JPEGs have been deleted.')
