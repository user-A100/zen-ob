// Generate independent test vectors by executing only three inspected pure methods
// from the pinned original Zen source. The controller itself is never executed.
const fs=require('node:fs');
const source=fs.readFileSync('research/zen-browser/src/zen/spaces/ZenGradientGenerator.mjs','utf8');
const between=(a,b)=>source.slice(source.indexOf('  '+a+'('),source.indexOf('  '+b+'(')).trim();
const methods=[between('hslToRgb','rgbToHsl'),between('hueToRgb','calculateInitialPosition'),between('getColorFromPosition','getJSONPos')].map(s=>s.replaceAll('this.#currentLightness','this.lightness')).join(',\n');
const factory=Function('window','EXPLICIT_LIGHTNESS_TYPE','EXPLICIT_BLACKWHITE_TYPE',`return {${methods},panel:{querySelector(){return {}}},lightness:80}`);
const reference=factory({windowUtils:{getBoundsWithoutFlushing(){return {width:358,height:358}}}},'explicit-lightness','explicit-black-white');
const pages=JSON.parse(fs.readFileSync('research/zen-theme-presets.json','utf8')).pages;
const vectors=pages.flatMap(page=>page.presets.map(p=>{reference.lightness=p.lightness??50;const point={x:Math.trunc(p.position.x),y:Math.trunc(p.position.y),lightness:reference.lightness,type:p.type};return {point,rgb:reference.getColorFromPosition(point.x,point.y,point.type)};}));
for(const [x,y] of [[179,179],[40,179],[179,50],[290,240]]) {reference.lightness=80;vectors.push({point:{x,y,lightness:80},rgb:reference.getColorFromPosition(x,y)});}
fs.mkdirSync('scripts/fixtures',{recursive:true});
fs.writeFileSync('scripts/fixtures/zen-color-vectors.json',JSON.stringify({source:'Zen Browser f2b18c4f6179a3918c0d92f2a7406322cda4ad12; MPL-2.0',vectors},null,2));
console.log('Generated',vectors.length,'reference vectors');
