(async()=>{
 await app.plugins.loadManifests();
 const result={version:window.appVersion,manifests:Object.keys(app.plugins.manifests)};
 const name = 'atlas-sidebar';
 await app.plugins.enablePlugin(name);
 const plugin=app.plugins.plugins[name];
 await plugin.revealTabsView();
 const file=app.vault.getAbstractFileByPath('Welcome.md');
 await app.workspace.getLeaf('tab').openFile(file);
 result.loaded=!!plugin;
 result.rows=document.querySelectorAll('.zen-row').length;
 result.view=app.workspace.getLeavesOfType('zen-tabs').length;
 return result;
})()
