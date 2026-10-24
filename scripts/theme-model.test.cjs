const {test}=require('node:test'); const assert=require('node:assert/strict');const fs=require('node:fs');
const {buildSync}=require('../plugin/node_modules/esbuild');
fs.mkdirSync('.test-output',{recursive:true});
buildSync({entryPoints:['plugin/zen-theme-model.ts'],outfile:'.test-output/zen-theme-model.cjs',bundle:true,platform:'node',format:'cjs'});
const m=require('../.test-output/zen-theme-model.cjs');
test('Matches 41 original presets and 4 free-position samples',()=>{
 for(const v of require('./fixtures/zen-color-vectors.json').vectors) assert.deepEqual(m.pointColor(v.point),v.rgb,JSON.stringify(v.point));
});
test('Harmony cycling preserves the primary and computes independent color relationships',()=>{
 const s={points:[{x:280,y:179,lightness:80}],algorithm:'floating',opacity:.5,texture:0};
 m.arrange(s,2,'complementary');assert.ok(Math.abs(s.points[1].x-78)<.001);assert.ok(Math.abs(s.points[1].y-179)<.001);
 m.arrange(s,3,'triadic');assert.equal(s.points.length,3);assert.ok(Math.abs(s.points[1].x-128.5)<.001);assert.ok(Math.abs(s.points[2].x-128.5)<.001);
});
test('Malformed persisted data is bounded and cannot inject CSS',()=>{
 const s=m.sanitizeTheme({points:[{x:Infinity,y:-999,lightness:'bad',type:'url(x)'}],algorithm:'bad',opacity:99,texture:-7});
 assert.equal(s.opacity,.8);assert.equal(s.texture,0);assert.equal(s.algorithm,'floating');assert.equal(s.points[0].type,undefined);assert.ok(Math.hypot(s.points[0].x-179,s.points[0].y-179)<=179.00001);
});
test('Opacity blends colors into the opaque platform base, not desktop transparency',()=>{
 const s=m.defaultTheme();s.opacity=.25;const c=m.themeColors(s,false)[0],original=m.pointColor(s.points[0]);
 assert.deepEqual(c,original.map((v,i)=>Math.round(v*.25+[240,240,244][i]*.75)));
 assert.ok(!m.gradient(m.themeColors(s,false),false).includes('rgba'));
});
