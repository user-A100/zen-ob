(async()=>{
 for (const name of ['atlas-sidebar','vertical-tabs','zen-mint-sidebar']) await app.plugins.disablePlugin(name);
 app.workspace.getLeavesOfType('vertical-tabs').forEach(l=>l.detach());
 app.workspace.getLeavesOfType('zen-tabs').forEach(l=>l.detach());
 await app.plugins.loadManifests();
 await app.plugins.enablePluginAndSave('zen-mint-sidebar');
 const plugin=app.plugins.plugins['zen-mint-sidebar'];
 if(!plugin) throw Error('Zen Mint did not load');
 await plugin.revealTabsView();
 await app.customCss.setTheme('Zen Mint');
 return {host:plugin.hostVersion,plugin:plugin.manifest.version,loaded:!!plugin,commands:Object.keys(app.commands.commands).filter(k=>/go-back|go-forward|open-settings/.test(k)),leftMethods:Object.getOwnPropertyNames(Object.getPrototypeOf(app.workspace.leftSplit))};
})()
