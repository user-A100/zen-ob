(async()=>{
 await app.plugins.disablePlugin('atlas-sidebar');
 await app.plugins.enablePlugin('vertical-tabs');
 const commands=Object.keys(app.commands.commands).filter(k=>k.startsWith('vertical-tabs:'));
 const leaf=app.workspace.getLeftLeaf(false);
 await leaf.setViewState({type:'vertical-tabs',active:true});
 await app.workspace.revealLeaf(leaf);
 return {loaded:!!app.plugins.plugins['vertical-tabs'],view:app.workspace.getLeavesOfType('vertical-tabs').length,commands:commands.length};
})()
