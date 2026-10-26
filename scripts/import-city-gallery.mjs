import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/import-city-gallery.mjs <city-folder-root> (macOS sips required)')
const cities = {
  上海: 'Shanghai', 三亚: 'Sanya', 杭州: 'Hangzhou', 江门: 'Jiangmen', 贵州: 'Guizhou',
  重庆: 'Chongqing', 青岛: 'Qingdao', 黄山: 'Huangshan', 首尔: 'Seoul',
  布拉格: 'Prague', 布达佩斯: 'Budapest', 巴塞罗那: 'Barcelona', 马德里: 'Madrid',
}
const output = resolve('public/images/cities')
mkdirSync(output, { recursive: true })
const photos = []
for (const [cityCn, city] of Object.entries(cities)) {
  const files = readdirSync(join(source, cityCn)).filter(f => /\.(jpe?g|png|heic)$/i.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  for (const [index, file] of files.entries()) {
    const input = join(source, cityCn, file)
    const number = String(index + 1).padStart(2, '0')
    const hash = createHash('sha256').update(`${cityCn}/${file}`).digest('hex').slice(0, 8)
    const id = `${city.toLowerCase()}-${number}-${hash}`
    for (const [suffix, size, quality] of [['', 1800, 80], ['-thumb', 720, 76]]) {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), '-Z', String(size), input, '--out', join(output, `${id}${suffix}.jpg`)], { stdio: 'ignore' })
    }
    photos.push({ id, city, cityCn, title: `${city} · ${number}`, location: cityCn,
      src: `/images/cities/${id}.jpg`, thumbnail: `/images/cities/${id}-thumb.jpg`,
      alt: `${cityCn}旅行照片 ${number}`, sourceFile: `${cityCn}/${file}` })
  }
  console.log(`${city}: ${files.length}`)
}
writeFileSync(resolve('src/data/cityGallery.json'), JSON.stringify(photos, null, 2) + '\n')
console.log(`Imported ${photos.length} photographs.`)
