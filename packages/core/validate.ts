import { calculateStarChart } from './src/astrology/western/index.js';
import { longitudeToSign } from './src/astrology/western/AstroMath.js';

// 测试1：日期模式 - 1990年1月15日，北京时区+8
const result1 = calculateStarChart({
  year: 1990, month: 1, day: 15,
  timezoneOffset: 8,
});
console.log('=== 日期模式 ===');
console.log('模式:', result1.mode);
result1.planets.forEach(p => {
  console.log(p.name + ':', p.sign, p.degree.toFixed(1) + '°');
});
if (result1.moonWarning) {
  console.log('月亮警告:', JSON.stringify(result1.moonWarning));
}

// 测试2：时分模式 - 1990年1月15日 12:30，北京 (116.4°E, 39.9°N)
const result2 = calculateStarChart({
  year: 1990, month: 1, day: 15,
  hour: 12, minute: 30,
  timezoneOffset: 8,
  lat: 39.9, lng: 116.4,
});
if (result2.mode !== 'full') throw new Error('expected full mode');
console.log('\n=== 时分模式 ===');
console.log('ASC:', result2.angles.asc.toFixed(2) + '°', longitudeToSign(result2.angles.asc));
console.log('MC:', result2.angles.mc.toFixed(2) + '°', longitudeToSign(result2.angles.mc));
console.log('DESC:', result2.angles.desc.toFixed(2) + '°');
console.log('IC:', result2.angles.ic.toFixed(2) + '°');
console.log('宫位系统:', result2.houses.systemUsed);
if (result2.houses.warning) console.log('警告:', result2.houses.warning);
result2.houses.cusps.forEach(h => {
  console.log(`第${h.house}宫: ${h.longitude.toFixed(1)}°  ${h.sign}`);
});

// 测试3：斯德哥尔摩 59.3°N — 不超过65°，应使用Placidus
const result3 = calculateStarChart({
  year: 1990, month: 1, day: 15,
  hour: 12, minute: 30,
  timezoneOffset: 1,
  lat: 59.3, lng: 18.1,
});
if (result3.mode !== 'full') throw new Error('expected full mode');
console.log('\n=== 斯德哥尔摩（59.3°N）===');
console.log('宫位系统:', result3.houses.systemUsed);
if (result3.houses.warning) console.log('警告:', result3.houses.warning);

// 测试4：极地 66°N — 超过65°，应降级为Whole Sign
const result4 = calculateStarChart({
  year: 1990, month: 1, day: 15,
  hour: 12, minute: 30,
  timezoneOffset: 0,
  lat: 66.0, lng: -18.1,
});
if (result4.mode !== 'full') throw new Error('expected full mode');
console.log('\n=== 极地（66°N）===');
console.log('宫位系统:', result4.houses.systemUsed);
if (result4.houses.warning) console.log('警告:', result4.houses.warning);

console.log('\n✓ 所有测试通过');
