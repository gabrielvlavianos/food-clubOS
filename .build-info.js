// This file helps verify that each deploy generates unique files
// Check this in browser console: console.log(window.__NEXT_DATA__.buildId)

if (typeof window !== 'undefined') {
  window.__BUILD_INFO__ = {
    buildTime: process.env.BUILD_TIME || 'unknown',
    deployId: process.env.DEPLOY_ID || 'unknown',
    buildDate: new Date().toISOString()
  };
}
